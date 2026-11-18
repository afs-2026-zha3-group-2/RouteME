package routeme.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import routeme.entity.UserEntity;
import routeme.entity.UserGrowthAccountEntity;
import routeme.mapper.GrowthExpLedgerMapper;
import routeme.mapper.UserGrowthAccountMapper;
import routeme.mapper.UserMapper;

/**
 * 成长账户的初始、存量不回填与懒建：读取只保证账户存在，不写流水。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class GrowthAccountApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserGrowthAccountMapper accountMapper;

    @Autowired
    private GrowthExpLedgerMapper ledgerMapper;

    @Autowired
    private UserMapper userMapper;

    @Test
    void in_newUser_out_lv1AndZeroExp() throws Exception {
        mockMvc.perform(get("/api/users/{userId}/profile", 1L).header("X-User-Id", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.growth.level").value(1))
                .andExpect(jsonPath("$.growth.exp").value(0))
                .andExpect(jsonPath("$.growth.exp_to_next").value(100))
                .andExpect(jsonPath("$.growth.max_level").value(false));
    }

    @Test
    void in_existingUsers_out_allLv1WithoutBackfill() throws Exception {
        var users = userMapper.selectList(null);
        for (UserEntity user : users) {
            long userId = user.getId();
            mockMvc.perform(get("/api/users/{userId}/profile", userId).header("X-User-Id", userId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.growth.level").value(1));
        }
        assertAllAccountsZero(users.size());
        assertAll(
                () -> org.junit.jupiter.api.Assertions.assertEquals(0L, ledgerRows(), "no ledger backfill"));
    }

    @Test
    void in_missingAccount_out_lazyCreatedOnceWithoutLedger() throws Exception {
        accountMapper.deleteById(3L);

        mockMvc.perform(get("/api/users/{userId}/profile", 3L).header("X-User-Id", 3L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.growth.level").value(1))
                .andExpect(jsonPath("$.growth.exp").value(0));
        mockMvc.perform(get("/api/users/{userId}/profile", 3L).header("X-User-Id", 3L))
                .andExpect(status().isOk());

        UserGrowthAccountEntity created = accountMapper.selectById(3L);
        org.junit.jupiter.api.Assertions.assertAll(
                () -> org.junit.jupiter.api.Assertions.assertNotNull(created, "account is lazily created"),
                () -> org.junit.jupiter.api.Assertions.assertEquals(0, created.getExpTotal(), "created with 0 exp"),
                () -> org.junit.jupiter.api.Assertions.assertEquals(0L, ledgerRows(), "read writes no ledger"));
    }

    private void assertAllAccountsZero(int users) {
        var accounts = accountMapper.selectList(null);
        org.junit.jupiter.api.Assertions.assertAll(
                () -> org.junit.jupiter.api.Assertions.assertEquals(users, accounts.size(), "one account per seeded user"),
                () -> org.junit.jupiter.api.Assertions.assertTrue(
                        accounts.stream().allMatch(account -> account.getExpTotal() == 0), "all start at 0 exp"));
    }

    private long ledgerRows() {
        return ledgerMapper.selectCount(null);
    }

    private static void assertAll(org.junit.jupiter.api.function.Executable... executables) {
        org.junit.jupiter.api.Assertions.assertAll(executables);
    }
}
