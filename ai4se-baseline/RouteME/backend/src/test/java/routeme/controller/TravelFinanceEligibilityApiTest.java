package routeme.controller;

import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
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
 * 资格派生、账号状态与数据隔离（E18、E31–E36、E38）。
 * 用户 1 在行程 3 只有 PENDING；在行程 4 是 ACCEPTED；用户 2 是行程 3 发布者、行程 6 的 ACCEPTED。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(FixedClockTestConfig.class)
class TravelFinanceEligibilityApiTest {

    private static final int INITIAL_BALANCE_CENTS = 1_000_000;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Test
    void in_nonParticipantTripFinance_out_notEligibleWithReason() throws Exception {
        mockMvc.perform(get("/api/trips/3/finance").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trip_id").value(3))
                .andExpect(jsonPath("$.is_eligible").value(false))
                .andExpect(jsonPath("$.ineligible_reason").value("not_participant"))
                .andExpect(jsonPath("$.wallet.balance_cents").value(INITIAL_BALANCE_CENTS))
                .andExpect(jsonPath("$.insurance.status").value("not_purchased"))
                .andExpect(jsonPath("$.insurance.purchase_url").value(nullValue()))
                .andExpect(jsonPath("$.insurance.policy").doesNotExist())
                .andExpect(jsonPath("$.loans.length()").value(0));
    }

    @Test
    void in_closedTripFinance_out_tripClosed() throws Exception {
        mockMvc.perform(get("/api/trips/1/finance").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trip_status").value("completed"))
                .andExpect(jsonPath("$.is_eligible").value(false))
                .andExpect(jsonPath("$.ineligible_reason").value("trip_closed"))
                .andExpect(jsonPath("$.insurance.purchase_url").value(nullValue()));
    }

    @Test
    void in_acceptedCompanionOrPublisher_out_eligible() throws Exception {
        // 用户 1 是行程 4 的 ACCEPTED 同行者（进行中）。
        mockMvc.perform(get("/api/trips/4/finance").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.is_eligible").value(true))
                .andExpect(jsonPath("$.trip_status").value("ongoing"));

        // 用户 2 是行程 6 的 ACCEPTED 同行者（满员）。
        mockMvc.perform(get("/api/trips/6/finance").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.is_eligible").value(true))
                .andExpect(jsonPath("$.trip_status").value("full"));

        // 用户 2 是行程 3 的发布者（进行中）。
        mockMvc.perform(get("/api/trips/3/finance").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.is_eligible").value(true))
                .andExpect(jsonPath("$.ineligible_reason").value(nullValue()));
    }

    @Test
    void in_nonParticipantPurchaseOrBorrow_out_forbidden() throws Exception {
        mockMvc.perform(post("/api/trips/3/insurance/purchase").header("X-User-Id", "1"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        mockMvc.perform(post("/api/trips/3/insurance/confirm").header("X-User-Id", "1"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        mockMvc.perform(post("/api/trips/3/loans")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"principal_cents\":100000,\"term_days\":14}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        assertAll(
                () -> assertEquals(0, count("insurance_policy", 1), "no policy"),
                () -> assertEquals(0, count("travel_loan", 1), "no loan"),
                () -> assertEquals(0, count("wallet_ledger", 1), "no ledger row"),
                () -> assertEquals(INITIAL_BALANCE_CENTS, balanceOf(1), "no charge"));
    }

    @Test
    void in_suspendedAccount_out_cannotConfirmInsurance() throws Exception {
        jdbcClient.sql("UPDATE app_users SET status = 'SUSPENDED' WHERE id = 2").update();

        mockMvc.perform(post("/api/trips/3/insurance/confirm").header("X-User-Id", "2"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCOUNT_SUSPENDED"));

        assertAll(
                () -> assertEquals(0, count("insurance_policy", 2), "no policy"),
                () -> assertEquals(0, count("wallet_ledger", 2), "no ledger row"));
    }

    @Test
    void in_foreignOrUnknownLoanRepay_out_forbidden() throws Exception {
        // Given：用户 2 借 1,000 元。
        borrow(3, 2, 100_000, 14);
        Number loanIdNumber = JsonPath.read(
                mockMvc.perform(get("/api/me/finance").header("X-User-Id", "2"))
                        .andExpect(status().isOk())
                        .andReturn().getResponse().getContentAsString(),
                "$.loans[0].id");
        long loanId = loanIdNumber.longValue();

        // When / Then：他人与不存在的 loanId 都按 FORBIDDEN 处理（不泄漏存在性）。
        mockMvc.perform(post("/api/loans/{loanId}/repay", loanId).header("X-User-Id", "1"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        mockMvc.perform(post("/api/loans/999999/repay").header("X-User-Id", "1"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        assertAll(
                () -> assertEquals("ACTIVE", loanValue(loanId), "loan stays active"),
                () -> assertEquals(1_095_000, balanceOf(2), "borrower balance untouched"),
                () -> assertEquals(1, count("wallet_ledger", 2), "no repayment ledger row"));
    }

    @Test
    void in_aggregate_out_onlyOwnData() throws Exception {
        // Given：用户 2 有一条保险记录与一笔借款。
        confirm(3, 2);
        borrow(3, 2, 100_000, 14);

        // When / Then：用户 1 的聚合页不含用户 2 的任何记录。
        mockMvc.perform(get("/api/me/finance").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.wallet.balance_cents").value(INITIAL_BALANCE_CENTS))
                .andExpect(jsonPath("$.ledger.length()").value(0))
                .andExpect(jsonPath("$.policies.length()").value(0))
                .andExpect(jsonPath("$.loans.length()").value(0));

        mockMvc.perform(get("/api/me/finance").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.policies.length()").value(1))
                .andExpect(jsonPath("$.loans.length()").value(1));
    }

    @Test
    void in_anyTransaction_out_loanAmountsAreIntegerCents() throws Exception {
        // Given：保险确认不产生金额；借款产生整数分流水。
        confirm(3, 2);
        borrow(3, 2, 100_000, 14);

        // When
        MvcResult result = mockMvc.perform(get("/api/me/finance").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andReturn();
        String body = result.getResponse().getContentAsString();

        // Then：所有金额字段都是整数分，序列化后没有小数。
        assertAll(
                () -> assertInstanceOf(Integer.class, JsonPath.read(body, "$.wallet.balance_cents"), "wallet int"),
                () -> assertInstanceOf(Integer.class, JsonPath.read(body, "$.ledger[0].amount_cents"), "ledger int"),
                () -> assertInstanceOf(Integer.class, JsonPath.read(body, "$.ledger[0].balance_before_cents"), "before int"),
                () -> assertInstanceOf(Integer.class, JsonPath.read(body, "$.ledger[0].balance_after_cents"), "after int"),
                () -> assertEquals(1_000_000,
                        ((Number) JsonPath.read(body, "$.ledger[0].balance_before_cents")).intValue(),
                        "loan disbursement starts from the seeded balance"),
                () -> assertEquals(1_095_000,
                        ((Number) JsonPath.read(body, "$.ledger[0].balance_after_cents")).intValue(),
                        "1,000,000 + 95,000"),
                () -> assertInstanceOf(Integer.class, JsonPath.read(body, "$.loans[0].principal_cents"), "loan int"),
                () -> assertInstanceOf(Integer.class, JsonPath.read(body, "$.loans[0].service_fee_cents"), "loan fee int"),
                () -> assertInstanceOf(Integer.class, JsonPath.read(body, "$.loans[0].disbursed_cents"), "net int"),
                () -> assertInstanceOf(Integer.class, JsonPath.read(body, "$.loans[0].repay_cents"), "repay int"),
                () -> assertEquals(1_095_000,
                        ((Number) JsonPath.read(body, "$.wallet.balance_cents")).intValue(),
                        "1,000,000 + 95,000 stays in cents"));
    }

    @Test
    void in_tripFinance_out_loanAmountsAreIntegerCents() throws Exception {
        // Given
        borrow(3, 2, 100_000, 14);

        // When
        MvcResult result = mockMvc.perform(get("/api/trips/3/finance").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andReturn();
        String body = result.getResponse().getContentAsString();

        // Then：行程维度页复用同一批金额字段，仍是整数分。
        assertAll(
                () -> assertInstanceOf(Integer.class, JsonPath.read(body, "$.wallet.balance_cents"), "wallet int"),
                () -> assertInstanceOf(Integer.class, JsonPath.read(body, "$.loans[0].disbursed_cents"), "net int"),
                () -> assertEquals(1_095_000,
                        ((Number) JsonPath.read(body, "$.wallet.balance_cents")).intValue(),
                        "1,000,000 + 95,000"));
    }

    private void confirm(long tripId, long userId) throws Exception {
        mockMvc.perform(post("/api/trips/{tripId}/insurance/confirm", tripId)
                        .header("X-User-Id", userId))
                .andExpect(status().isOk());
    }

    private void borrow(long tripId, long userId, int principalCents, int termDays) throws Exception {
        mockMvc.perform(post("/api/trips/{tripId}/loans", tripId)
                        .header("X-User-Id", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"principal_cents\":" + principalCents + ",\"term_days\":" + termDays + "}"))
                .andExpect(status().isCreated());
    }

    private int balanceOf(long userId) {
        return jdbcClient.sql("SELECT balance_cents FROM user_wallet WHERE user_id = :userId")
                .param("userId", userId)
                .query(Integer.class)
                .single();
    }

    private int count(String table, long userId) {
        return jdbcClient.sql("SELECT COUNT(*) FROM " + table + " WHERE user_id = :userId")
                .param("userId", userId)
                .query(Integer.class)
                .single();
    }

    private String loanValue(long loanId) {
        return jdbcClient.sql("SELECT status FROM travel_loan WHERE id = :id")
                .param("id", loanId)
                .query(String.class)
                .single();
    }
}