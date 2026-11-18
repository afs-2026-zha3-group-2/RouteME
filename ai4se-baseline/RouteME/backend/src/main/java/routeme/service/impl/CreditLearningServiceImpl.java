package routeme.service.impl;

import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import routeme.constant.CreditLearningConstant;
import routeme.credit.LearningQuestionBank;
import routeme.entity.CreditLearningSessionEntity;
import routeme.exception.InvalidInputException;
import routeme.exception.LearningExamQuotaExceededException;
import routeme.exception.LearningNotCompletedException;
import routeme.exception.LearningNotEligibleException;
import routeme.exception.LearningRecoveryQuotaExceededException;
import routeme.exception.LearningSessionNotFoundException;
import routeme.mapper.CreditLearningSessionMapper;
import routeme.pojo.CreditBooking;
import routeme.pojo.UserCredit;
import routeme.response.LearningAnswerDetailResponse;
import routeme.response.LearningQuestionResponse;
import routeme.response.LearningResultResponse;
import routeme.response.LearningSessionResponse;
import routeme.service.CreditLearningService;
import routeme.service.CreditService;
import routeme.utils.CreditLearningKey;
import routeme.utils.CreditMonth;
import routeme.utils.JsonListUtils;

/**
 * 安全学习考试的业务实现：会话行只记结果，分数一律经 {@link CreditService} 读写。
 * 方法契约以 {@link CreditLearningService} 为准。
 */
@Service
public class CreditLearningServiceImpl
        extends AbstractServiceImpl<CreditLearningSessionMapper, CreditLearningSessionEntity>
        implements CreditLearningService {

    private final CreditService creditService;
    private final LearningQuestionBank questionBank;
    private final Clock clock;
    private final Random random;

    /**
     * Spring 入口：抽题用默认随机源；测试可用包级构造器注入固定 seed。
     */
    @Autowired
    public CreditLearningServiceImpl(
            CreditService creditService,
            LearningQuestionBank questionBank,
            Clock clock) {
        this(creditService, questionBank, clock, new Random());
    }

    CreditLearningServiceImpl(
            CreditService creditService,
            LearningQuestionBank questionBank,
            Clock clock,
            Random random) {
        this.creditService = creditService;
        this.questionBank = questionBank;
        this.clock = clock;
        this.random = random;
    }

    @Override
    @Transactional
    public LearningSessionResponse start(long userId) {
        UserCredit credit = creditService.read(userId);
        if (credit.score() >= CreditLearningConstant.RECOVERY_TARGET_SCORE) {
            throw new LearningNotEligibleException(credit.score());
        }
        String monthKey = CreditMonth.monthKey(clock.instant());
        // 本月已用掉恢复额度且分数仍未到 60：再考也无处加分，直接告知配额用完，避免浪费考试次数。
        if (creditService.recorded(CreditLearningKey.recoveryKey(userId, monthKey))) {
            throw new LearningRecoveryQuotaExceededException(monthKey);
        }
        int used = examUsed(userId, monthKey);
        if (used >= CreditLearningConstant.EXAMS_PER_MONTH) {
            throw new LearningExamQuotaExceededException(monthKey);
        }

        CreditLearningSessionEntity session = new CreditLearningSessionEntity();
        session.setId(nextId(CreditLearningSessionEntity::getId));
        session.setUserId(userId);
        session.setMonthKey(monthKey);
        session.setStatus(CreditLearningConstant.STATUS_STARTED);
        session.setQuestionIds(JsonListUtils.write(questionBank.draw(random)));
        session.setStartedAt(clock.instant().toString());
        save(session);
        return toSessionResponse(session, used + 1);
    }

    @Override
    @Transactional
    public LearningSessionResponse completeLessons(long userId, long sessionId) {
        CreditLearningSessionEntity session = requireOwnSession(userId, sessionId);
        if (session.getLearningCompletedAt() == null) {
            session.setLearningCompletedAt(clock.instant().toString());
            updateById(session);
        }
        return toSessionResponse(session, examUsed(userId, session.getMonthKey()));
    }

    @Override
    @Transactional
    public LearningResultResponse submit(long userId, long sessionId, List<Integer> answers) {
        CreditLearningSessionEntity session = requireOwnSession(userId, sessionId);
        if (CreditLearningConstant.STATUS_SUBMITTED.equals(session.getStatus())) {
            return toResultResponse(session);
        }
        if (session.getLearningCompletedAt() == null) {
            throw new LearningNotCompletedException(sessionId);
        }

        List<String> questionIds = JsonListUtils.parse(session.getQuestionIds());
        List<Integer> given = validatedAnswers(answers, questionIds.size());
        List<LearningAnswerDetailResponse> details = judge(questionIds, given);
        int score = (int) details.stream().filter(LearningAnswerDetailResponse::correct).count();
        boolean passed = score >= CreditLearningConstant.PASS_LINE;

        session.setStatus(CreditLearningConstant.STATUS_SUBMITTED);
        session.setAnswers(JsonListUtils.writeInts(given));
        session.setScore(score);
        session.setPassed(passed ? 1 : 0);
        session.setSubmittedAt(clock.instant().toString());

        if (!passed) {
            updateById(session);
            return toResultResponse(session, details, false, creditService.read(userId));
        }

        UserCredit before = creditService.read(userId);
        String recoveryKey = CreditLearningKey.recoveryKey(userId, session.getMonthKey());
        // 判定顺序固定：先月度配额，后当前分数（月度已恢复时原因码必须是配额而非资格）。
        if (creditService.recorded(recoveryKey)) {
            throw new LearningRecoveryQuotaExceededException(session.getMonthKey());
        }
        if (before.score() >= CreditLearningConstant.RECOVERY_TARGET_SCORE) {
            throw new LearningNotEligibleException(before.score());
        }
        UserCredit after = creditService.book(new CreditBooking(
                userId,
                CreditLearningConstant.REASON_SAFETY_LEARNING_RECOVERY,
                Math.min(CreditLearningConstant.RECOVERY_TARGET_SCORE - before.score(), recoveryBonus(score)),
                CreditLearningConstant.RELATED_TYPE_LEARNING_SESSION,
                String.valueOf(session.getId()),
                recoveryKey));
        updateById(session);
        // 以账本行是否属于本会话为准：并发下被唯一索引兑底的那次没有自己的记录，不得重复播报恢复。
        boolean applied = creditService.recorded(recoveryKey, String.valueOf(session.getId()));
        return toResultResponse(session, details, applied, after);
    }

    private CreditLearningSessionEntity requireOwnSession(long userId, long sessionId) {
        CreditLearningSessionEntity session = getById(sessionId);
        if (session == null || session.getUserId() == null || session.getUserId().longValue() != userId) {
            throw new LearningSessionNotFoundException(sessionId);
        }
        return session;
    }

    /** 恢复加分梯度：8 题 +10、9 题 +15、10 题 +20；写入账本时再按与 60 的缺口封顶。 */
    private static int recoveryBonus(int correct) {
        if (correct >= CreditLearningConstant.QUESTION_COUNT) {
            return CreditLearningConstant.RECOVERY_BONUS_PERFECT;
        }
        if (correct > CreditLearningConstant.PASS_LINE) {
            return CreditLearningConstant.RECOVERY_BONUS_GOOD;
        }
        return CreditLearningConstant.RECOVERY_BONUS_PASS;
    }

    private int examUsed(long userId, String monthKey) {
        return (int) count(Wrappers.<CreditLearningSessionEntity>lambdaQuery()
                .eq(CreditLearningSessionEntity::getUserId, userId)
                .eq(CreditLearningSessionEntity::getMonthKey, monthKey));
    }

    private static List<Integer> validatedAnswers(List<Integer> answers, int expected) {
        if (answers == null || answers.size() != expected) {
            throw new InvalidInputException("answers must contain " + expected + " entries");
        }
        for (Integer answer : answers) {
            if (answer == null || answer < 0 || answer >= CreditLearningConstant.OPTION_COUNT) {
                throw new InvalidInputException(
                        "each answer must be between 0 and " + (CreditLearningConstant.OPTION_COUNT - 1));
            }
        }
        return List.copyOf(answers);
    }

    private List<LearningAnswerDetailResponse> judge(List<String> questionIds, List<Integer> answers) {
        List<LearningAnswerDetailResponse> details = new ArrayList<>(questionIds.size());
        for (int index = 0; index < questionIds.size(); index++) {
            boolean correct = questionBank.require(questionIds.get(index)).answerIndex() == answers.get(index);
            details.add(new LearningAnswerDetailResponse(questionIds.get(index), correct));
        }
        return details;
    }

    private LearningSessionResponse toSessionResponse(CreditLearningSessionEntity session, int examUsed) {
        List<LearningQuestionResponse> questions = JsonListUtils.parse(session.getQuestionIds()).stream()
                .map(questionBank::require)
                .map(LearningQuestionResponse::from)
                .toList();
        return new LearningSessionResponse(
                session.getId(),
                questions,
                examUsed,
                CreditLearningConstant.EXAMS_PER_MONTH,
                session.getMonthKey(),
                session.getLearningCompletedAt() != null);
    }

    /**
     * 已提交会话的原样回放：不重新判分、不改分，只据存量作答复算明细。
     */
    private LearningResultResponse toResultResponse(CreditLearningSessionEntity session) {
        List<String> questionIds = JsonListUtils.parse(session.getQuestionIds());
        List<Integer> answers = JsonListUtils.parseInts(session.getAnswers());
        String recoveryKey = CreditLearningKey.recoveryKey(session.getUserId(), session.getMonthKey());
        boolean passed = Integer.valueOf(1).equals(session.getPassed());
        boolean recovered = passed && creditService.recorded(recoveryKey, String.valueOf(session.getId()));
        return toResultResponse(
                session, judge(questionIds, answers), recovered, creditService.read(session.getUserId()));
    }

    private static LearningResultResponse toResultResponse(
            CreditLearningSessionEntity session,
            List<LearningAnswerDetailResponse> details,
            boolean recoveryApplied,
            UserCredit credit) {
        return new LearningResultResponse(
                session.getId(),
                Integer.valueOf(1).equals(session.getPassed()),
                session.getScore() == null ? 0 : session.getScore(),
                CreditLearningConstant.PASS_LINE,
                details,
                recoveryApplied,
                credit.score(),
                credit.levelCode());
    }
}
