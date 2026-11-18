package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import routeme.config.FixedClockTestConfig;
import routeme.entity.CreditLearningSessionEntity;
import routeme.entity.CreditLedgerEntity;
import routeme.entity.CreditRestrictionEntity;
import routeme.exception.LearningRecoveryQuotaExceededException;
import routeme.mapper.CreditRestrictionMapper;
import routeme.response.LearningResultResponse;
import routeme.service.CreditLearningService;

/**
 * A29：同一用户两个会话并发通过时只恢复一次（R7）。
 *
 * <p>真并发无法共享测试事务，故本用例关闭测试事务直连服务层，并在结束时删除自己造的行。
 * 只会出现两种结果：一侧写账本成功，另一侧要么读到已恢复（配额拒绝）、
 * 要么被唯一索引兜底后返回既有分数——两种都不产生第二条恢复记录。</p>
 *
 * <p>必须固定时钟：提交式用例会真实刷新「到期行程」（{@code materializeExpired} 用注入时钟取当天），
 * 若用系统时钟（晚于种子行程结束日）就会把共享库里的种子行程写成已完成，污染后续所有用例。</p>
 */
@Import(FixedClockTestConfig.class)
class CreditLearningConcurrencyTest extends CreditLearningTestSupport {

    private static final long USER_ID = 990001L;

    @Autowired
    private CreditLearningService creditLearningService;

    @Autowired
    private CreditRestrictionMapper restrictionMapper;

    @AfterEach
    void cleanUp() {
        sessionMapper.delete(Wrappers.<CreditLearningSessionEntity>lambdaQuery()
                .eq(CreditLearningSessionEntity::getUserId, USER_ID));
        ledgerMapper.delete(Wrappers.<CreditLedgerEntity>lambdaQuery()
                .eq(CreditLedgerEntity::getUserId, USER_ID));
        restrictionMapper.delete(Wrappers.<CreditRestrictionEntity>lambdaQuery()
                .eq(CreditRestrictionEntity::getUserId, USER_ID));
        accountMapper.deleteById(USER_ID);
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void in_concurrentPasses_out_singleRecovery() throws Exception {
        // Given
        setScore(USER_ID, 45);
        long first = creditLearningService.start(USER_ID).sessionId();
        long second = creditLearningService.start(USER_ID).sessionId();
        creditLearningService.completeLessons(USER_ID, first);
        creditLearningService.completeLessons(USER_ID, second);
        List<Integer> firstAnswers = answersFor(first, 8);
        List<Integer> secondAnswers = answersFor(second, 8);

        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch go = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        List<Boolean> applied = new ArrayList<>();
        int rejected = 0;
        try {
            Callable<LearningResultResponse> submitFirst = () -> {
                ready.countDown();
                go.await();
                return creditLearningService.submit(USER_ID, first, firstAnswers);
            };
            Callable<LearningResultResponse> submitSecond = () -> {
                ready.countDown();
                go.await();
                return creditLearningService.submit(USER_ID, second, secondAnswers);
            };

            // When
            Future<LearningResultResponse> outcomeFirst = pool.submit(submitFirst);
            Future<LearningResultResponse> outcomeSecond = pool.submit(submitSecond);
            assertTrue(ready.await(5, TimeUnit.SECONDS), "both threads reached the gate");
            go.countDown();

            for (Future<LearningResultResponse> outcome : List.of(outcomeFirst, outcomeSecond)) {
                try {
                    applied.add(outcome.get(10, TimeUnit.SECONDS).recoveryApplied());
                } catch (ExecutionException exception) {
                    assertTrue(exception.getCause() instanceof LearningRecoveryQuotaExceededException,
                            "only the recovery quota may reject the loser: " + exception.getCause());
                    rejected++;
                }
            }
        } finally {
            pool.shutdownNow();
        }

        // Then
        int appliedCount = (int) applied.stream().filter(Boolean::booleanValue).count();
        int rejectedCount = rejected;
        assertAll(
                () -> assertEquals(1, recoveryRows(USER_ID).size(), "single recovery row"),
                () -> assertEquals(55, creditService.read(USER_ID).score(), "eight correct = +10, only one row"),
                () -> assertEquals(1, appliedCount, "exactly one submission applied the recovery"),
                () -> assertEquals(2, rejectedCount + applied.size(), "both submissions answered"));
    }
}
