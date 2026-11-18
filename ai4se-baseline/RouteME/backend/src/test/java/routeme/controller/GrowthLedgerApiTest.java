package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import routeme.entity.GrowthExpLedgerEntity;
import routeme.entity.UserGrowthAccountEntity;
import routeme.mapper.GrowthExpLedgerMapper;
import routeme.mapper.UserGrowthAccountMapper;
import routeme.pojo.GrowthBooking;
import routeme.service.GrowthService;

/**
 * 经验流水：等式与回算、无客户端写入口、不存在用户沿用既有错误且不建孤立账户。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class GrowthLedgerApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private GrowthService growthService;

    @Autowired
    private UserGrowthAccountMapper accountMapper;

    @Autowired
    private GrowthExpLedgerMapper ledgerMapper;

    @Test
    void in_mixedEvents_out_equationAndReversibleSum() {
        growthService.book(GrowthBooking.publish(1L, 301L, 10));
        growthService.book(GrowthBooking.like(1L, 401L, 10));
        growthService.book(GrowthBooking.report(1L, 501L));

        List<GrowthExpLedgerEntity> rows = ledgerMapper.selectList(null);
        int sum = rows.stream().mapToInt(GrowthExpLedgerEntity::getAppliedDelta).sum();
        assertAll(
                () -> assertEquals(3, rows.size(), "three events"),
                () -> assertTrue(rows.stream().allMatch(row ->
                        row.getExpBefore() + row.getAppliedDelta() == row.getExpAfter()), "equation holds"),
                () -> assertTrue(rows.stream().allMatch(row -> row.getExpAfter() >= 0), "never negative"),
                () -> assertEquals(0, sum, "10 + 5 - 15 = 0"),
                () -> assertEquals(sum, expOf(1L), "account equals ledger sum"),
                () -> assertEquals(-15, rows.get(2).getAppliedDelta(), "clamped to zero"));
    }

    @Test
    void in_clientWriteAttempt_out_noWriteEndpoint() throws Exception {
        mockMvc.perform(post("/api/users/growth")).andExpect(status().isMethodNotAllowed());
        mockMvc.perform(put("/api/users/growth")).andExpect(status().isMethodNotAllowed());
        mockMvc.perform(put("/api/users/me/growth").header("X-User-Id", 1L))
                .andExpect(status().isNotFound());
    }

    @Test
    void in_unknownUser_out_userNotFoundWithoutOrphanAccount() throws Exception {
        mockMvc.perform(get("/api/users/{userId}/profile", 9999L).header("X-User-Id", 1L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("USER_NOT_FOUND"));
        mockMvc.perform(get("/api/users/growth").param("ids", "9999").header("X-User-Id", 1L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("USER_NOT_FOUND"));

        assertNull(accountMapper.selectById(9999L), "no orphan account");
    }

    @Test
    void in_batchRead_out_onlyLevels() throws Exception {
        mockMvc.perform(get("/api/users/growth").param("ids", "1,2").header("X-User-Id", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].user_id").value(1))
                .andExpect(jsonPath("$[0].level").value(1))
                .andExpect(jsonPath("$[0].exp").doesNotExist())
                .andExpect(jsonPath("$[1].user_id").value(2));
    }

    @Test
    void in_batchReadWithoutIdsOrOverLimit_out_badRequest() throws Exception {
        mockMvc.perform(get("/api/users/growth").header("X-User-Id", 1L))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));

        String tooMany = java.util.stream.LongStream.rangeClosed(1, 51)
                .mapToObj(String::valueOf)
                .collect(java.util.stream.Collectors.joining(","));
        mockMvc.perform(get("/api/users/growth").param("ids", tooMany).header("X-User-Id", 1L))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    private int expOf(long userId) {
        UserGrowthAccountEntity account = accountMapper.selectById(userId);
        assertNotNull(account, "account exists");
        return account.getExpTotal();
    }
}
