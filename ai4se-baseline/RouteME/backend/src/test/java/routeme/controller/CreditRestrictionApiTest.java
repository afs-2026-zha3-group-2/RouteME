package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.jayway.jsonpath.JsonPath;

import routeme.config.FixedClockTestConfig;
import routeme.entity.CreditLedgerEntity;
import routeme.entity.CreditRestrictionEntity;
import routeme.entity.TripApplicationEntity;
import routeme.enums.ApplicationStatusEnum;
import routeme.enums.TripStatusEnum;
import routeme.mapper.CreditLedgerMapper;
import routeme.mapper.CreditRestrictionMapper;
import routeme.mapper.TripApplicationMapper;
import routeme.pojo.CreditBooking;
import routeme.pojo.TripApplication;
import routeme.service.ApplicationService;
import routeme.service.CreditRestrictionGuard;
import routeme.service.CreditService;
import routeme.service.TripPlanService;

/**
 * 信用限制的 API 验收：65→55 触发、只读 403、自动清理、系统取消原因、自动解除。
 * 低信用由测试内 CreditService.book 触发，不新增管理员或测试写接口。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(FixedClockTestConfig.class)
class CreditRestrictionApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CreditService creditService;

    @Autowired
    private CreditRestrictionGuard restrictionGuard;

    @Autowired
    private CreditRestrictionMapper restrictionMapper;

    @Autowired
    private CreditLedgerMapper ledgerMapper;

    @Autowired
    private TripApplicationMapper applicationMapper;

    @Autowired
    private ApplicationService applicationService;

    @Autowired
    private TripPlanService tripPlanService;

    @Test
    void in_score65ThenMinus10_out_restrictionAndWriteGuards() throws Exception {
        seedScore(1, 65);
        creditService.book(new CreditBooking(1, "REPORT_UPHELD", -10, null, null, null));

        // 本人看到原因；他人只看到受限徽标
        mockMvc.perform(get("/api/users/1/profile").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credit_score").value(55))
                .andExpect(jsonPath("$.credit_level").value("low"))
                .andExpect(jsonPath("$.credit_restricted").value(true))
                .andExpect(jsonPath("$.credit_restriction_reason").value("CREDIT_SCORE_BELOW_60"));
        mockMvc.perform(get("/api/users/1/profile").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credit_restricted").value(true))
                .andExpect(jsonPath("$.credit_restriction_reason").doesNotExist());
        mockMvc.perform(get("/api/users/credits?ids=1").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].credit_restricted").value(true));

        // 待处理申请被撤回，已接受同行关系被解除
        assertEquals(ApplicationStatusEnum.CANCELLED, application(1, 3).status());
        assertEquals(ApplicationStatusEnum.LEFT, application(1, 4).status());
        assertEquals(1, tripPlanService.require(4).joinedCount());

        // 写入口统一 403 CREDIT_RESTRICTED
        mockMvc.perform(post("/api/trips")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CREDIT_RESTRICTED"));
        mockMvc.perform(post("/api/trips/5/applications")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"想加入\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CREDIT_RESTRICTED"));
        mockMvc.perform(post("/api/trips/4/messages")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"receiver_id\":3,\"content\":\"hi\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CREDIT_RESTRICTED"));
        mockMvc.perform(post("/api/trips/1/experiences")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CREDIT_RESTRICTED"));

        // 查看与历史聊天保留
        mockMvc.perform(get("/api/trips/4").header("X-User-Id", "1"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/trips/4/messages?with=3").header("X-User-Id", "1"))
                .andExpect(status().isOk());

        // 资料保存需要会话；拿到 token 后仍被守卫拦截
        String token = loginToken("linjianxia", "123456");
        mockMvc.perform(put("/api/users/me/profile")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CREDIT_RESTRICTED"));

        // 系统清退不写退出账本
        assertTrue(ledgerRows(1).stream().noneMatch(row -> row.getReasonCode().startsWith("EXIT_")));

        // 分数回到 60 自动解除；原关系不恢复
        creditService.book(new CreditBooking(1, "SYSTEM_ADJUST", 10, null, null, null));
        mockMvc.perform(get("/api/users/1/profile").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credit_score").value(65))
                .andExpect(jsonPath("$.credit_restricted").value(false))
                .andExpect(jsonPath("$.credit_restriction_reason").doesNotExist());
        assertEquals(0, activeRestrictions(1).size());
        assertEquals(ApplicationStatusEnum.LEFT, application(1, 4).status());
        assertEquals(ApplicationStatusEnum.CANCELLED, application(1, 3).status());

        // 解除后可以重新申请
        mockMvc.perform(post("/api/trips/5/applications")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"解除后重新申请\"}"))
                .andExpect(status().isCreated());
    }

    @Test
    void in_restrictedPublisher_out_publishedTripsCancelledAndReasonVisible() throws Exception {
        seedScore(2, 65);
        creditService.book(new CreditBooking(2, "REPORT_UPHELD", -10, null, null, null));

        assertAll(
                () -> assertEquals(TripStatusEnum.CANCELLED, tripPlanService.require(3).status(FixedClockTestConfig.NOW)),
                () -> assertEquals("credit_restricted", tripPlanService.require(3).cancelReason()),
                () -> assertEquals("信用分低于 60，账号受限", tripPlanService.require(3).cancelNote()),
                () -> assertEquals(TripStatusEnum.CANCELLED, tripPlanService.require(5).status(FixedClockTestConfig.NOW)),
                () -> assertEquals("credit_restricted", tripPlanService.require(5).cancelReason()),
                () -> assertEquals(ApplicationStatusEnum.LEFT, application(2, 6).status()),
                () -> assertEquals(1, tripPlanService.require(6).joinedCount()));

        // 发布者与已接受同行者可见系统原因；普通待处理申请者不可见
        mockMvc.perform(get("/api/trips/3").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cancel_reason").value("credit_restricted"))
                .andExpect(jsonPath("$.cancel_note").value("信用分低于 60，账号受限"));
        mockMvc.perform(get("/api/trips/3").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cancel_reason").doesNotExist())
                .andExpect(jsonPath("$.cancel_note").doesNotExist());

        // 行程取消导致的待处理申请状态原因是 TRIP_CANCELLED，不是申请人受限
        TripApplicationEntity pending = applicationMapper.selectById(4L);
        assertAll(
                () -> assertEquals(ApplicationStatusEnum.CANCELLED.name(), pending.getStatus()),
                () -> assertEquals("TRIP_CANCELLED", pending.getStatusReason()));
        assertTrue(ledgerRows(2).stream().noneMatch(row -> row.getReasonCode().startsWith("EXIT_")));
    }

    @Test
    void in_score60And59_out_boundaryAndSingleActiveRestriction() throws Exception {
        seedScore(4, 60);
        assertFalse(restrictionGuard.isRestricted(4));

        creditService.book(new CreditBooking(4, "REPORT_UPHELD", -1, null, null, null));
        assertTrue(restrictionGuard.isRestricted(4));
        assertEquals(1, activeRestrictions(4).size());

        creditService.book(new CreditBooking(4, "REPORT_UPHELD", -1, null, null, null));
        assertTrue(restrictionGuard.isRestricted(4));
        assertEquals(1, activeRestrictions(4).size(), "one active restriction per user");
    }

    private void seedScore(long userId, int target) {
        int current = creditService.read(userId).score();
        creditService.book(CreditBooking.of(userId, "TEST_SEED", target - current));
    }

    private TripApplication application(long userId, long tripId) {
        return applicationService.mine(userId).stream()
                .filter(item -> item.tripId() == tripId)
                .findFirst()
                .orElseThrow();
    }

    private List<CreditRestrictionEntity> activeRestrictions(long userId) {
        return restrictionMapper.selectList(Wrappers.<CreditRestrictionEntity>lambdaQuery()
                .eq(CreditRestrictionEntity::getUserId, userId)
                .eq(CreditRestrictionEntity::getActiveFlag, 1));
    }

    private List<CreditLedgerEntity> ledgerRows(long userId) {
        return ledgerMapper.selectList(Wrappers.<CreditLedgerEntity>lambdaQuery()
                .eq(CreditLedgerEntity::getUserId, userId)
                .orderByAsc(CreditLedgerEntity::getId));
    }

    private String loginToken(String username, String password) throws Exception {
        String body = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return JsonPath.read(body, "$.token");
    }
}
