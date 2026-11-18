package routeme.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import routeme.config.FixedClockTestConfig;

/**
 * 第三方保险入口、确认回写、到期派生、幂等与数据隔离（E8–E19）。
 * 固定时钟 2026-11-16T09:00Z：行程 3 进行中（11-16），行程 5 未开始（11-23 ~ 11-24），行程 1 已结束。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(FixedClockTestConfig.class)
class TravelFinanceInsuranceApiTest {

    private static final int INITIAL_BALANCE_CENTS = 1_000_000;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Test
    void in_tripFinance_out_thirdPartySummaryWithoutPricing() throws Exception {
        mockMvc.perform(get("/api/trips/3/finance").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.destination").value("珠海市"))
                .andExpect(jsonPath("$.companion_count").isNumber())
                .andExpect(jsonPath("$.insurance.status").value("not_purchased"))
                .andExpect(jsonPath("$.insurance.policy").doesNotExist())
                .andExpect(jsonPath("$.insurance.provider.name").value("第三方保险机构"))
                .andExpect(jsonPath("$.insurance.provider.claim_url").exists())
                .andExpect(jsonPath("$.insurance.products.length()").value(3))
                .andExpect(jsonPath("$.insurance.products[0].code").exists())
                .andExpect(jsonPath("$.insurance.products[0].summary").exists())
                .andExpect(jsonPath("$.insurance.products[0].premium_cents").doesNotExist())
                .andExpect(jsonPath("$.insurance.purchase_url").value(containsString("trip_id=3")));
    }

    @Test
    void in_purchase_out_redirectOnlyWithoutWalletOrPolicy() throws Exception {
        // Given：用户 2 是行程 3 发布者。
        mockMvc.perform(post("/api/trips/3/insurance/purchase").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.redirect_url").value(containsString("trip_id=3")));

        // Then：RouteMe 不扣款、不写保单与流水。
        assertAll(
                () -> assertEquals(INITIAL_BALANCE_CENTS, balanceOf(2), "wallet unchanged"),
                () -> assertEquals(0, policyRows(2), "no policy before third-party confirmation"),
                () -> assertEquals(0, ledgerRows(2), "no ledger row"));
    }

    @Test
    void in_confirm_out_activePolicyForTripDatesAndIdempotent() throws Exception {
        mockMvc.perform(post("/api/trips/3/insurance/confirm").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trip_id").value(3))
                .andExpect(jsonPath("$.provider").value("第三方保险机构"))
                .andExpect(jsonPath("$.coverage_start").value("2026-11-16"))
                .andExpect(jsonPath("$.coverage_end").value("2026-11-16"))
                .andExpect(jsonPath("$.status").value("active"))
                .andExpect(jsonPath("$.confirmed_at").exists());

        long firstId = policyId(2);

        // 重复确认幂等：同一行、不扣款。
        mockMvc.perform(post("/api/trips/3/insurance/confirm").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(firstId));

        assertAll(
                () -> assertEquals(1, policyRows(2), "one policy per trip"),
                () -> assertEquals(INITIAL_BALANCE_CENTS, balanceOf(2), "confirmation is free"),
                () -> assertEquals(0, ledgerRows(2), "no wallet ledger rows"));
    }

    @Test
    void in_futureTripConfirm_out_coverageStartsAtTripStart() throws Exception {
        mockMvc.perform(post("/api/trips/5/insurance/confirm").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coverage_start").value("2026-11-23"))
                .andExpect(jsonPath("$.coverage_end").value("2026-11-24"))
                .andExpect(jsonPath("$.status").value("active"));
    }

    @Test
    void in_expiredCoverage_out_expiredStatusWithoutMigration() throws Exception {
        // Given：保障结束日已过（固定时钟 2026-11-16）。
        insertPolicy(2, 3, "2026-11-14", "2026-11-15");

        // When / Then：状态只读派生为 expired，记录仍保留。
        mockMvc.perform(get("/api/me/finance").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.policies.length()").value(1))
                .andExpect(jsonPath("$.policies[0].status").value("expired"));

        mockMvc.perform(get("/api/trips/3/finance").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.insurance.status").value("expired"))
                .andExpect(jsonPath("$.insurance.policy.status").value("expired"));
    }

    @Test
    void in_nonParticipant_out_forbiddenOnPurchaseAndConfirm() throws Exception {
        // 用户 1 在行程 3 只有 PENDING。
        mockMvc.perform(post("/api/trips/3/insurance/purchase").header("X-User-Id", "1"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        mockMvc.perform(post("/api/trips/3/insurance/confirm").header("X-User-Id", "1"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        assertEquals(0, policyRows(1), "non-participant creates no record");
    }

    @Test
    void in_closedTrip_out_tripNotOpen() throws Exception {
        // 行程 1 已结束；行程 91 由用户 1 发布并已取消。
        insertCancelledTrip(91, 1);

        mockMvc.perform(post("/api/trips/1/insurance/confirm").header("X-User-Id", "1"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_OPEN"));
        mockMvc.perform(post("/api/trips/91/insurance/purchase").header("X-User-Id", "1"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_OPEN"));

        assertAll(
                () -> assertEquals(0, policyRows(1), "no policy"),
                () -> assertEquals(INITIAL_BALANCE_CENTS, balanceOf(1), "no charge"));
    }

    @Test
    void in_suspendedAccount_out_cannotConfirmOrOpenPurchase() throws Exception {
        jdbcClient.sql("UPDATE app_users SET status = 'SUSPENDED' WHERE id = 2").update();

        mockMvc.perform(post("/api/trips/3/insurance/confirm").header("X-User-Id", "2"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCOUNT_SUSPENDED"));
        mockMvc.perform(post("/api/trips/3/insurance/purchase").header("X-User-Id", "2"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCOUNT_SUSPENDED"));

        assertEquals(0, policyRows(2), "suspended account creates no record");
    }

    @Test
    void in_policyLists_out_onlyOwnDataAndTripScope() throws Exception {
        // Given：用户 2 在两条自己的行程各确认一次。
        confirm(3, 2);
        confirm(5, 2);

        // When / Then：聚合页两条，行程页只含该行程。
        mockMvc.perform(get("/api/me/finance").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.policies.length()").value(2))
                .andExpect(jsonPath("$.policies[*].trip_id", hasItem(3)));

        mockMvc.perform(get("/api/trips/3/finance").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.insurance.status").value("active"))
                .andExpect(jsonPath("$.insurance.policy.trip_id").value(3));

        // 他人看不到用户 2 的保险记录。
        mockMvc.perform(get("/api/me/finance").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.policies.length()").value(0));
        mockMvc.perform(get("/api/trips/3/finance").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.insurance.status").value("not_purchased"))
                .andExpect(jsonPath("$.insurance.policy").doesNotExist());
    }

    @Test
    void in_policyResponse_out_noSensitiveOrPricingFields() throws Exception {
        confirm(3, 2);

        mockMvc.perform(get("/api/trips/3/finance").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.insurance.policy.policy_no").doesNotExist())
                .andExpect(jsonPath("$.insurance.policy.id_card").doesNotExist())
                .andExpect(jsonPath("$.insurance.policy.premium_cents").doesNotExist())
                .andExpect(jsonPath("$.insurance.policy.coverage_cents").doesNotExist());
    }

    private void confirm(long tripId, long userId) throws Exception {
        mockMvc.perform(post("/api/trips/{tripId}/insurance/confirm", tripId)
                        .header("X-User-Id", userId))
                .andExpect(status().isOk());
    }

    private int balanceOf(long userId) {
        return jdbcClient.sql("SELECT balance_cents FROM user_wallet WHERE user_id = :userId")
                .param("userId", userId)
                .query(Integer.class)
                .single();
    }

    private int policyRows(long userId) {
        return jdbcClient.sql("SELECT COUNT(*) FROM insurance_policy WHERE user_id = :userId")
                .param("userId", userId)
                .query(Integer.class)
                .single();
    }

    private long policyId(long userId) {
        return jdbcClient.sql("SELECT id FROM insurance_policy WHERE user_id = :userId")
                .param("userId", userId)
                .query(Long.class)
                .single();
    }

    private int ledgerRows(long userId) {
        return jdbcClient.sql("SELECT COUNT(*) FROM wallet_ledger WHERE user_id = :userId")
                .param("userId", userId)
                .query(Integer.class)
                .single();
    }

    private void insertPolicy(long userId, long tripId, String start, String end) {
        jdbcClient.sql("""
                        INSERT INTO insurance_policy
                            (id, user_id, trip_id, provider, coverage_start, coverage_end, status, confirmed_at)
                        VALUES
                            (9001, :userId, :tripId, '第三方保险机构', :start, :end, 'ACTIVE',
                             '2026-11-14T00:00:00Z')
                        """)
                .param("userId", userId)
                .param("tripId", tripId)
                .param("start", start)
                .param("end", end)
                .update();
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