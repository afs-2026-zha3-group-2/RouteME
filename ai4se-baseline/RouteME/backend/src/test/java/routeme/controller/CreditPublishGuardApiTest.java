package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.jayway.jsonpath.JsonPath;

import routeme.config.FixedClockTestConfig;
import routeme.constant.CreditLearningConstant;
import routeme.entity.TripPlanEntity;
import routeme.mapper.TripPlanMapper;

/**
 * A1–A4：低分只拦「发布行程」这一处，恢复后自动解除，其余功能不受影响。
 *
 * <p>固定时钟停在 2026-11-16，发布体用 2026-11-20 起，避免落到过去日期。</p>
 */
@Import(FixedClockTestConfig.class)
class CreditPublishGuardApiTest extends CreditLearningTestSupport {

    /** 与 {@code TripControllerTest} 同形的可发布行程。 */
    private static final String PUBLISH_BODY = """
            {
              "title": "广州老城骑楼扫街半日",
              "destination_code": "440100",
              "start_date": "2026-11-20",
              "end_date": "2026-11-20",
              "stops": ["陈家祠地铁站集合", "永庆坊"],
              "meeting_areas": ["陈家祠地铁站 D 口"],
              "budget_min_cents": 8000,
              "budget_max_cents": 15000,
              "tags": ["摄影", "历史"],
              "capacity": 4,
              "note": "走街串巷为主。"
            }
            """;

    /** 资料保存的最简合法体：必填五项齐全。 */
    private static final String PROFILE_BODY = """
            {"nickname":"低分也要能改资料","birthday":"2003-05-18","gender":"女","city":"珠海",
             "interests":["摄影","美食","徒步"],"travel_style":"休闲游"}
            """;

    @Autowired
    private TripPlanMapper tripPlanMapper;

    @Test
    void in_score45_out_publishForbiddenAndNoTripWritten() throws Exception {
        long userId = register("gate_low_45");
        setScore(userId, 45);
        long before = tripCount();

        publish(userId, PUBLISH_BODY)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CREDIT_SCORE_BELOW_60"));

        assertEquals(before, tripCount(), "被拦截时不得写入行程");
    }

    @Test
    void in_score59Blocked_score60Allowed() throws Exception {
        long userId = register("gate_boundary_60");

        setScore(userId, CreditLearningConstant.PUBLISH_MIN_SCORE - 1);
        publish(userId, PUBLISH_BODY)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CREDIT_SCORE_BELOW_60"));

        setScore(userId, CreditLearningConstant.PUBLISH_MIN_SCORE);
        publish(userId, PUBLISH_BODY)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.publisher.id").value((int) userId));
    }

    @Test
    void in_recoveredToTarget_out_sameRequestSucceeds() throws Exception {
        long userId = register("gate_recovered");
        setScore(userId, 45);
        publish(userId, PUBLISH_BODY).andExpect(status().isForbidden());

        long sessionId = startSessionId(userId);
        completeLessons(userId, sessionId);
        submitAnswers(userId, sessionId, answersFor(sessionId, CreditLearningConstant.PASS_LINE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.passed").value(true))
                .andExpect(jsonPath("$.credit_score").value(CreditLearningConstant.RECOVERY_TARGET_SCORE));

        publish(userId, PUBLISH_BODY)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.publisher.id").value((int) userId));
    }

    @Test
    void in_score45_out_applyCancelChatAndProfileUnaffected() throws Exception {
        long userId = register("gate_other_paths");
        setScore(userId, 45);

        // 申请：trip 5 招募中，与低分无关。
        MvcResult applied = mockMvc.perform(post("/api/trips/5/applications")
                        .header("X-User-Id", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"低分也要能报名。\"}"))
                .andExpect(status().isCreated())
                .andReturn();

        // 撤回：同一条申请。
        Number applicationId = JsonPath.read(applied.getResponse().getContentAsString(), "$.id");
        mockMvc.perform(post("/api/applications/" + applicationId + "/cancel").header("X-User-Id", userId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("cancelled"));

        // 聊天：trip 4 中 1 与 3 是已接受同行。
        setScore(1, 45);
        mockMvc.perform(post("/api/trips/4/messages")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"receiver_id\":3,\"content\":\"低分也要能聊天。\"}"))
                .andExpect(status().isCreated());

        // 改资料：写入口只认 Bearer 会话。
        mockMvc.perform(put("/api/users/me/profile")
                        .header("Authorization", "Bearer " + login("gate_other_paths"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(PROFILE_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profile_complete").value(true));
    }

    private ResultActions publish(long userId, String body) throws Exception {
        return mockMvc.perform(post("/api/trips")
                .header("X-User-Id", userId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private String login(String username) throws Exception {
        MvcResult session = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"%s\",\"password\":\"routeme-demo\"}".formatted(username)))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(session.getResponse().getContentAsString(), "$.token");
    }

    private long tripCount() {
        return tripPlanMapper.selectCount(Wrappers.<TripPlanEntity>emptyWrapper());
    }
}
