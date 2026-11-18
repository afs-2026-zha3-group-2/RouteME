package routeme.controller;

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
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;

import routeme.config.FixedClockTestConfig;

/**
 * 演示钱包 Red 用例（R1 钱包初始化 / R2 读取不改余额）。
 * 覆盖 E1–E4：注册即有钱包、存量账号由 V25 回填、重复读取仍只有一条钱包。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(FixedClockTestConfig.class)
class TravelFinanceWalletApiTest {

    private static final int INITIAL_BALANCE_CENTS = 1_000_000;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Test
    void in_seededAccount_out_initialWalletBalance() throws Exception {
        // Given：V25 已为全部演示账号回填 1,000,000 分。
        // When
        mockMvc.perform(get("/api/me/finance").header("X-User-Id", "1"))
                // Then
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.wallet.balance_cents").value(INITIAL_BALANCE_CENTS))
                .andExpect(jsonPath("$.ledger.length()").value(0))
                .andExpect(jsonPath("$.policies.length()").value(0))
                .andExpect(jsonPath("$.loans.length()").value(0));
    }

    @Test
    void in_newAccount_out_initialWalletOnFirstRead() throws Exception {
        // Given
        MvcResult registered = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "WalletNewbie",
                                  "password": "routeme-demo",
                                  "nickname": "钱包新人"
                                }
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        Number userId = JsonPath.read(registered.getResponse().getContentAsString(), "$.user.id");

        // When
        mockMvc.perform(get("/api/me/finance").header("X-User-Id", userId.longValue()))
                // Then
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.wallet.balance_cents").value(INITIAL_BALANCE_CENTS));

        assertEquals(1, walletRows(userId.longValue()), "a new account owns exactly one wallet");
    }

    @Test
    void in_repeatedRead_out_singleWalletAndUnchangedBalance() throws Exception {
        // Given
        mockMvc.perform(get("/api/me/finance").header("X-User-Id", "2"))
                .andExpect(status().isOk());

        // When
        mockMvc.perform(get("/api/me/finance").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.wallet.balance_cents").value(INITIAL_BALANCE_CENTS));

        // Then
        assertAll(
                () -> assertEquals(1, walletRows(2), "repeated reads keep a single wallet row"),
                () -> assertEquals(
                        INITIAL_BALANCE_CENTS,
                        jdbcClient.sql("SELECT balance_cents FROM user_wallet WHERE user_id = :userId")
                                .param("userId", 2)
                                .query(Integer.class)
                                .single(),
                        "reading leaves the balance unchanged"));
    }

    @Test
    void in_confirmBorrowRepay_out_creditScoreUnchanged() throws Exception {
        // Given：用户 2 是进行中行程 3 的发布者，初始信用分 80、无信用流水。
        int scoreBefore = creditScore(2);
        int creditRowsBefore = creditRows(2);

        // When：确认第三方保险 → 借款 → 还款；保险不产生钱包流水。
        mockMvc.perform(post("/api/trips/3/insurance/confirm").header("X-User-Id", "2"))
                .andExpect(status().isOk());
        long loanId = borrow(3, 2, 100_000, 14);
        mockMvc.perform(post("/api/loans/{loanId}/repay", loanId).header("X-User-Id", "2"))
                .andExpect(status().isOk());

        // Then：金融交易只动钱包与账本，不改信用分、不写信用流水。
        assertAll(
                () -> assertEquals(scoreBefore, creditScore(2), "credit score is unchanged"),
                () -> assertEquals(creditRowsBefore, creditRows(2), "no credit ledger rows"),
                () -> assertEquals(994_300, balanceOf(2), "wallet reflects only the loan postings"),
                () -> assertEquals(2, ledgerRows(2), "disbursement + repayment"));
    }

    @Test
    void in_missingIdentity_out_unauthorized() throws Exception {
        // Given：未登录演示身份。
        // When
        mockMvc.perform(get("/api/me/finance"))
                // Then
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("DEMO_USER_REQUIRED"));
    }

    private int creditScore(long userId) {
        return jdbcClient.sql("SELECT score FROM user_credit_account WHERE user_id = :userId")
                .param("userId", userId)
                .query(Integer.class)
                .single();
    }

    private int creditRows(long userId) {
        return jdbcClient.sql("SELECT COUNT(*) FROM credit_ledger WHERE user_id = :userId")
                .param("userId", userId)
                .query(Integer.class)
                .single();
    }

    private long borrow(long tripId, long userId, int principalCents, int termDays) throws Exception {
        MvcResult created = mockMvc.perform(post("/api/trips/{tripId}/loans", tripId)
                        .header("X-User-Id", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"principal_cents\":" + principalCents + ",\"term_days\":" + termDays + "}"))
                .andExpect(status().isCreated())
                .andReturn();
        Number loanId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");
        return loanId.longValue();
    }

    private int balanceOf(long userId) {
        return jdbcClient.sql("SELECT balance_cents FROM user_wallet WHERE user_id = :userId")
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

    private int walletRows(long userId) {
        return jdbcClient.sql("SELECT COUNT(*) FROM user_wallet WHERE user_id = :userId")
                .param("userId", userId)
                .query(Integer.class)
                .single();
    }
}