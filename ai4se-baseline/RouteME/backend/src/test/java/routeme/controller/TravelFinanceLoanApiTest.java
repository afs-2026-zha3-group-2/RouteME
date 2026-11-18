package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;

import routeme.config.FixedClockTestConfig;

/**
 * 借款金额 / 期限 / 净额 / 到期 / 单笔进行中 / 还款与逾期（E20–E30、E34、E35）。
 * 固定时钟 2026-11-16T09:00Z；用户 2 是进行中行程 3 的发布者。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(FixedClockTestConfig.class)
class TravelFinanceLoanApiTest {

    private static final int INITIAL_BALANCE_CENTS = 1_000_000;
    private static final String NOW = "2026-11-16T09:00:00Z";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Test
    void in_borrowThousandFourteenDays_out_netDisbursedWithoutInterest() throws Exception {
        mockMvc.perform(post("/api/trips/3/loans")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"principal_cents\":100000,\"term_days\":14}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.trip_id").value(3))
                .andExpect(jsonPath("$.principal_cents").value(100_000))
                .andExpect(jsonPath("$.service_fee_cents").value(5_000))
                .andExpect(jsonPath("$.disbursed_cents").value(95_000))
                .andExpect(jsonPath("$.repay_cents").value(100_000))
                .andExpect(jsonPath("$.term_days").value(14))
                .andExpect(jsonPath("$.status").value("active"))
                .andExpect(jsonPath("$.funded_at").value(NOW))
                .andExpect(jsonPath("$.due_at").value("2026-11-30T09:00:00Z"));

        assertAll(
                () -> assertEquals(1_095_000, balanceOf(2), "1,000,000 + 95,000"),
                () -> assertEquals(1, ledgerRows(2), "one credit entry"),
                () -> assertEquals("CREDIT", ledgerValue(2, "direction"), "disbursement is a credit"),
                () -> assertEquals(95_000, ledgerInt(2, "amount_cents"), "net amount"),
                () -> assertEquals("LOAN_DISBURSEMENT", ledgerValue(2, "entry_type"), "business type"),
                () -> assertEquals("travel_loan", ledgerValue(2, "related_type"), "related business"));
    }

    @Test
    void in_clientDueAt_out_ignored() throws Exception {
        mockMvc.perform(post("/api/trips/3/loans")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"principal_cents":100000,"term_days":7,"due_at":"2000-01-01T00:00:00Z",
                                 "service_fee_cents":0,"disbursed_cents":100000,"repay_cents":1}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.service_fee_cents").value(5_000))
                .andExpect(jsonPath("$.disbursed_cents").value(95_000))
                .andExpect(jsonPath("$.repay_cents").value(100_000))
                .andExpect(jsonPath("$.due_at").value("2026-11-23T09:00:00Z"));
    }

    @Test
    void in_invalidPrincipalOrTerm_out_invalidInput() throws Exception {
        String[][] bodies = {
                {"9900", "14"},
                {"200100", "14"},
                {"10050", "14"},
                {"100000", "1"},
                {"100000", "10"},
                {"100000", "31"}
        };
        for (String[] body : bodies) {
            mockMvc.perform(post("/api/trips/3/loans")
                            .header("X-User-Id", "2")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"principal_cents\":" + body[0] + ",\"term_days\":" + body[1] + "}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        }

        assertAll(
                () -> assertEquals(0, loanRows(2), "no loan"),
                () -> assertEquals(0, ledgerRows(2), "no ledger row"),
                () -> assertEquals(INITIAL_BALANCE_CENTS, balanceOf(2), "no balance change"));
    }

    @Test
    void in_secondActiveLoan_out_conflictUntilRepaid() throws Exception {
        // Given
        borrow(3, 2, 100_000, 14);

        // When
        mockMvc.perform(post("/api/trips/3/loans")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"principal_cents\":50000,\"term_days\":7}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ACTIVE_LOAN_EXISTS"));

        // Then：仍只有一笔、一条流水。
        assertAll(
                () -> assertEquals(1, loanRows(2), "one active loan"),
                () -> assertEquals(1, ledgerRows(2), "one disbursement"),
                () -> assertEquals(1_095_000, balanceOf(2), "second request adds no money"));

        // And：还清后允许再借。
        repay(2, loanId(2));
        mockMvc.perform(post("/api/trips/3/loans")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"principal_cents\":50000,\"term_days\":7}"))
                .andExpect(status().isCreated());
        assertEquals(2, loanRows(2), "repayment releases the single-active slot");
    }

    @Test
    void in_repay_out_principalChargedAndMarkedRepaid() throws Exception {
        // Given
        borrow(3, 2, 100_000, 14);
        long loanId = loanId(2);

        // When
        mockMvc.perform(post("/api/loans/{loanId}/repay", loanId).header("X-User-Id", "2"))
                // Then
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(loanId))
                .andExpect(jsonPath("$.status").value("repaid"))
                .andExpect(jsonPath("$.repaid_at").value(NOW));

        assertAll(
                () -> assertEquals(995_000, balanceOf(2), "1,095,000 - 100,000"),
                () -> assertEquals(2, ledgerRows(2), "disbursement + repayment"),
                () -> assertEquals("DEBIT", latestLedgerValue(2, "direction"), "repayment is a debit"),
                () -> assertEquals(100_000, latestLedgerInt(2, "amount_cents"), "repay equals principal"),
                () -> assertEquals("LOAN_REPAYMENT", latestLedgerValue(2, "entry_type"), "repayment type"),
                () -> assertEquals("REPAID", loanValue(loanId, "status"), "stored status"),
                () -> assertNull(loanValue(loanId, "active_user_id"), "active slot released"),
                () -> assertNotNull(loanValue(loanId, "repaid_at"), "repaid_at recorded"));
    }

    @Test
    void in_insufficientBalanceOnRepay_out_conflictAndStillActive() throws Exception {
        // Given
        borrow(3, 2, 100_000, 14);
        long loanId = loanId(2);
        setBalance(2, 99_999);

        // When
        mockMvc.perform(post("/api/loans/{loanId}/repay", loanId).header("X-User-Id", "2"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INSUFFICIENT_BALANCE"));

        // Then
        assertAll(
                () -> assertEquals(99_999, balanceOf(2), "balance unchanged"),
                () -> assertEquals("ACTIVE", loanValue(loanId, "status"), "loan stays active"),
                () -> assertEquals(1, ledgerRows(2), "no repayment ledger row"));
    }

    @Test
    void in_repayTwice_out_loanNotActiveAndNoSecondCharge() throws Exception {
        // Given
        borrow(3, 2, 100_000, 14);
        long loanId = loanId(2);
        repay(2, loanId);
        int balanceAfterFirstRepay = balanceOf(2);

        // When
        mockMvc.perform(post("/api/loans/{loanId}/repay", loanId).header("X-User-Id", "2"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("LOAN_NOT_ACTIVE"));

        // Then
        assertAll(
                () -> assertEquals(balanceAfterFirstRepay, balanceOf(2), "no second charge"),
                () -> assertEquals(2, ledgerRows(2), "still two ledger rows"));
    }

    @Test
    void in_overdue_out_derivedStatusWithoutPenalty() throws Exception {
        // Given：借 7 天，把到期时刻改到过去。
        borrow(3, 2, 100_000, 7);
        long loanId = loanId(2);
        jdbcClient.sql("UPDATE travel_loan SET due_at = '2026-11-10T09:00:00Z' WHERE id = :id")
                .param("id", loanId)
                .update();

        // When
        mockMvc.perform(get("/api/me/finance").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                // Then
                .andExpect(jsonPath("$.loans[0].status").value("overdue"))
                .andExpect(jsonPath("$.loans[0].repay_cents").value(100_000));

        assertAll(
                () -> assertEquals(1_095_000, balanceOf(2), "overdue adds no charge"),
                () -> assertEquals("ACTIVE", loanValue(loanId, "status"), "overdue is not persisted"),
                () -> assertEquals(1, ledgerRows(2), "no penalty ledger row"));
    }

    @Test
    void in_suspendedOrBanned_out_cannotBorrow() throws Exception {
        // Given
        setAccountStatus(2, "SUSPENDED");

        // When / Then
        mockMvc.perform(post("/api/trips/3/loans")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"principal_cents\":100000,\"term_days\":14}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCOUNT_SUSPENDED"));

        setAccountStatus(2, "BANNED");
        mockMvc.perform(post("/api/trips/3/loans")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"principal_cents\":100000,\"term_days\":14}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCOUNT_BANNED"));

        assertAll(
                () -> assertEquals(0, loanRows(2), "no loan"),
                () -> assertEquals(0, ledgerRows(2), "no ledger row"),
                () -> assertEquals(INITIAL_BALANCE_CENTS, balanceOf(2), "no balance change"));
    }

    @Test
    void in_suspendedOut_repaymentStillAllowed() throws Exception {
        // Given
        borrow(3, 2, 100_000, 14);
        long loanId = loanId(2);
        setAccountStatus(2, "SUSPENDED");

        // When
        mockMvc.perform(post("/api/loans/{loanId}/repay", loanId).header("X-User-Id", "2"))
                // Then
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("repaid"));

        assertEquals("REPAID", loanValue(loanId, "status"), "suspension does not block repayment");
    }

    @Test
    void in_nonParticipantOrClosedTrip_out_forbiddenOrTripNotOpen() throws Exception {
        // Given：用户 1 在行程 3 只有 PENDING 申请；行程 1 已结束；行程 91 已取消。
        insertCancelledTrip(91, 1);

        // When / Then
        mockMvc.perform(post("/api/trips/3/loans")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"principal_cents\":100000,\"term_days\":14}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        mockMvc.perform(post("/api/trips/1/loans")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"principal_cents\":100000,\"term_days\":14}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_OPEN"));

        mockMvc.perform(post("/api/trips/91/loans")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"principal_cents\":100000,\"term_days\":14}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_OPEN"));

        assertAll(
                () -> assertEquals(0, loanRows(1), "no loan"),
                () -> assertEquals(0, ledgerRows(1), "no ledger row"),
                () -> assertEquals(INITIAL_BALANCE_CENTS, balanceOf(1), "no balance change"));
    }

    private void borrow(long tripId, long userId, int principalCents, int termDays) throws Exception {
        mockMvc.perform(post("/api/trips/{tripId}/loans", tripId)
                        .header("X-User-Id", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"principal_cents\":" + principalCents + ",\"term_days\":" + termDays + "}"))
                .andExpect(status().isCreated());
    }

    private void repay(long userId, long loanId) throws Exception {
        mockMvc.perform(post("/api/loans/{loanId}/repay", loanId).header("X-User-Id", userId))
                .andExpect(status().isOk());
    }

    private long loanId(long userId) {
        MvcResult result;
        try {
            result = mockMvc.perform(get("/api/me/finance").header("X-User-Id", userId))
                    .andExpect(status().isOk())
                    .andReturn();
            Number id = JsonPath.read(result.getResponse().getContentAsString(), "$.loans[0].id");
            return id.longValue();
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }

    private int balanceOf(long userId) {
        return jdbcClient.sql("SELECT balance_cents FROM user_wallet WHERE user_id = :userId")
                .param("userId", userId)
                .query(Integer.class)
                .single();
    }

    private void setBalance(long userId, int balanceCents) {
        jdbcClient.sql("UPDATE user_wallet SET balance_cents = :balance WHERE user_id = :userId")
                .param("balance", balanceCents)
                .param("userId", userId)
                .update();
    }

    private void setAccountStatus(long userId, String status) {
        jdbcClient.sql("UPDATE app_users SET status = :status WHERE id = :userId")
                .param("status", status)
                .param("userId", userId)
                .update();
    }

    private int loanRows(long userId) {
        return jdbcClient.sql("SELECT COUNT(*) FROM travel_loan WHERE user_id = :userId")
                .param("userId", userId)
                .query(Integer.class)
                .single();
    }

    private int ledgerRows(long userId) {
        return jdbcClient.sql("SELECT COUNT(*) FROM wallet_ledger WHERE user_id = :userId")
                .param("userId", userId)
                .query(Integer.class)
                .single();
    }

    private String loanValue(long loanId, String column) {
        return jdbcClient.sql("SELECT " + column + " FROM travel_loan WHERE id = :id")
                .param("id", loanId)
                .query(String.class)
                .optional()
                .orElse(null);
    }

    private String ledgerValue(long userId, String column) {
        return jdbcClient.sql("SELECT " + column + " FROM wallet_ledger WHERE user_id = :userId ORDER BY id")
                .param("userId", userId)
                .query(String.class)
                .single();
    }

    private int ledgerInt(long userId, String column) {
        return jdbcClient.sql("SELECT " + column + " FROM wallet_ledger WHERE user_id = :userId ORDER BY id")
                .param("userId", userId)
                .query(Integer.class)
                .single();
    }

    private String latestLedgerValue(long userId, String column) {
        return jdbcClient.sql("SELECT " + column + " FROM wallet_ledger WHERE user_id = :userId ORDER BY id DESC LIMIT 1")
                .param("userId", userId)
                .query(String.class)
                .single();
    }

    private int latestLedgerInt(long userId, String column) {
        return jdbcClient.sql("SELECT " + column + " FROM wallet_ledger WHERE user_id = :userId ORDER BY id DESC LIMIT 1")
                .param("userId", userId)
                .query(Integer.class)
                .single();
    }

    private void insertCancelledTrip(long id, long publisherId) {
        jdbcClient.sql("""
                        INSERT INTO trip_plans
                            (id, publisher_id, title, destination, destination_code, start_date, end_date,
                             stops, meeting_areas, note, budget_min_cents, budget_max_cents, tags,
                             capacity, joined_count, completed_at, cancelled_at, cancel_reason, created_at, updated_at)
                        VALUES
                            (:id, :publisherId, :title, '珠海市', '440400', '2026-11-20', '2026-11-21',
                             '["香洲港"]', NULL, NULL, NULL, NULL, '[]',
                             3, 1, NULL, '2026-11-16T00:00:00Z', 'personal',
                             '2026-11-01T00:00:00Z', '2026-11-01T00:00:00Z')
                        """)
                .param("id", id)
                .param("publisherId", publisherId)
                .param("title", "已取消行程 " + id)
                .update();
    }
}