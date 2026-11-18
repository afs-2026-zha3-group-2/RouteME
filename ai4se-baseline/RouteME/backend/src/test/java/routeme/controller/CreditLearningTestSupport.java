package routeme.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.jayway.jsonpath.JsonPath;

import routeme.constant.CreditLearningConstant;
import routeme.credit.LearningQuestionBank;
import routeme.entity.CreditLearningSessionEntity;
import routeme.entity.CreditLedgerEntity;
import routeme.entity.UserEntity;
import routeme.mapper.CreditLearningSessionMapper;
import routeme.mapper.CreditLedgerMapper;
import routeme.mapper.UserCreditAccountMapper;
import routeme.pojo.CreditBooking;
import routeme.service.CreditService;
import routeme.service.DemoUserService;
import routeme.utils.JsonListUtils;

/**
 * 安全学习用例的公共夹具：注册带 80 分账户的新用户、造分、走完「开始 → 学习完成 → 提交」。
 *
 * <p>造分只经既有记账服务（reason {@code SYSTEM_ADJUST}），保证账本等式成立；
 * 默认整类事务回滚，需要真并发的用例在方法上关闭测试事务。</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
abstract class CreditLearningTestSupport {

    protected static final String SESSIONS = "/api/credit/learning/sessions";

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected CreditService creditService;

    @Autowired
    protected CreditLearningSessionMapper sessionMapper;

    @Autowired
    protected CreditLedgerMapper ledgerMapper;

    @Autowired
    protected UserCreditAccountMapper accountMapper;

    @Autowired
    protected LearningQuestionBank questionBank;

    @Autowired
    protected DemoUserService demoUserService;

    protected ResultActions startSession(long userId) throws Exception {
        return mockMvc.perform(post(SESSIONS).header("X-User-Id", userId));
    }

    protected long startSessionId(long userId) throws Exception {
        MvcResult result = startSession(userId).andExpect(status().isCreated()).andReturn();
        Number sessionId = JsonPath.read(result.getResponse().getContentAsString(), "$.session_id");
        return sessionId.longValue();
    }

    protected void completeLessons(long userId, long sessionId) throws Exception {
        mockMvc.perform(post(SESSIONS + "/" + sessionId + "/lessons/complete").header("X-User-Id", userId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.learning_completed").value(true));
    }

    protected ResultActions submitAnswers(long userId, long sessionId, List<Integer> answers) throws Exception {
        return mockMvc.perform(post(SESSIONS + "/" + sessionId + "/submission")
                .header("X-User-Id", userId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"answers\": " + answers + "}"));
    }

    /**
     * 按本次抽到的题号拼作答：前 {@code correctCount} 题选正确答案，其余故意选错一题。
     */
    protected List<Integer> answersFor(long sessionId, int correctCount) {
        List<String> questionIds = JsonListUtils.parse(sessionMapper.selectById(sessionId).getQuestionIds());
        List<Integer> answers = new ArrayList<>(questionIds.size());
        for (int index = 0; index < questionIds.size(); index++) {
            int correct = questionBank.require(questionIds.get(index)).answerIndex();
            answers.add(index < correctCount ? correct : (correct + 1) % CreditLearningConstant.OPTION_COUNT);
        }
        return answers;
    }

    protected long register(String username) throws Exception {
        MvcResult registered = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "%s",
                                  "password": "routeme-demo",
                                  "nickname": "%s"
                                }
                                """.formatted(username, username)))
                .andExpect(status().isCreated())
                .andReturn();
        Number userId = JsonPath.read(registered.getResponse().getContentAsString(), "$.user.id");
        // 新注册账号默认未过学信网认证；涉及发布的用例需要先补齐门槛。
        UserEntity entity = demoUserService.getById(userId.longValue());
        entity.setStudentVerified(true);
        entity.setStudentVerifiedName(username);
        entity.setStudentVerifiedSchool("中山大学");
        demoUserService.updateById(entity);
        return userId.longValue();
    }

    protected void setScore(long userId, int target) {
        int current = creditService.read(userId).score();
        creditService.book(new CreditBooking(userId, "SYSTEM_ADJUST", target - current, null, null, null));
    }

    protected long sessionCount(long userId) {
        return sessionMapper.selectCount(Wrappers.<CreditLearningSessionEntity>lambdaQuery()
                .eq(CreditLearningSessionEntity::getUserId, userId));
    }

    protected long submissionCount(long userId) {
        return sessionMapper.selectCount(Wrappers.<CreditLearningSessionEntity>lambdaQuery()
                .eq(CreditLearningSessionEntity::getUserId, userId)
                .eq(CreditLearningSessionEntity::getStatus, CreditLearningConstant.STATUS_SUBMITTED));
    }

    protected List<CreditLedgerEntity> recoveryRows(long userId) {
        return ledgerMapper.selectList(Wrappers.<CreditLedgerEntity>lambdaQuery()
                .eq(CreditLedgerEntity::getUserId, userId)
                .eq(CreditLedgerEntity::getReasonCode, CreditLearningConstant.REASON_SAFETY_LEARNING_RECOVERY));
    }
}
