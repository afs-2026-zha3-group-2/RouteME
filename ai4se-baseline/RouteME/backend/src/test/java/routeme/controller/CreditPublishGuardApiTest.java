package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import routeme.config.FixedClockTestConfig;
import routeme.constant.CreditLearningConstant;
import routeme.entity.TripPlanEntity;
import routeme.mapper.TripPlanMapper;

/**
 * A1–A4：发布入口跟随 {@code CreditRestrictionGuard}（403 {@code CREDIT_RESTRICTED}），恢复至 60 后自动放行。
 *
 * <p>低分限制由 {@code add-credit-exit-restriction} 的只读守卫统一拦截写入口，本变更不再自建门禁；
 * 固定时钟停在 2026-11-16，发布体用 2026-11-20 起，避免落到过去日期。</p>
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

    @Autowired
    private TripPlanMapper tripPlanMapper;

    @Test
    void in_score45_out_publishForbiddenAndNoTripWritten() throws Exception {
        long userId = register("gate_low_45");
        setScore(userId, 45);
        long before = tripCount();

        publish(userId, PUBLISH_BODY)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CREDIT_RESTRICTED"));

        assertEquals(before, tripCount(), "被拦截时不得写入行程");
    }

    @Test
    void in_score59Blocked_score60Allowed() throws Exception {
        long userId = register("gate_boundary_60");

        setScore(userId, CreditLearningConstant.PUBLISH_MIN_SCORE - 1);
        publish(userId, PUBLISH_BODY)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CREDIT_RESTRICTED"));

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
        submitAnswers(userId, sessionId, answersFor(sessionId, CreditLearningConstant.QUESTION_COUNT))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.passed").value(true))
                .andExpect(jsonPath("$.credit_score").value(CreditLearningConstant.RECOVERY_TARGET_SCORE));

        publish(userId, PUBLISH_BODY)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.publisher.id").value((int) userId));
    }

    private ResultActions publish(long userId, String body) throws Exception {
        return mockMvc.perform(post("/api/trips")
                .header("X-User-Id", userId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private long tripCount() {
        return tripPlanMapper.selectCount(Wrappers.<TripPlanEntity>emptyWrapper());
    }
}
