package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import routeme.constant.ExperienceLikeConstant;
import routeme.entity.CreditLedgerEntity;
import routeme.entity.UserCreditAccountEntity;
import routeme.entity.UserEntity;
import routeme.mapper.CreditLedgerMapper;
import routeme.mapper.UserCreditAccountMapper;
import routeme.mapper.UserMapper;

/**
 * 获赞信用结算的月度验收：本月额度、额度耗尽、Asia/Shanghai 月首重置、总分裁断不占额度、
 * 多行程共享同一月度池。
 *
 * <p>时钟固定在 2026-11-17T04:00:00Z（北京时间 12:00），由本类可变 Clock 控制，
 * 只被本类 {@code @Import}，不影响其它测试类。</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(ExperienceLikeCreditMonthApiTest.MutableClockConfig.class)
class ExperienceLikeCreditMonthApiTest {

    private static final Instant NOW = Instant.parse("2026-11-17T04:00:00Z");
    private static final Instant DECEMBER_START = Instant.parse("2026-11-30T16:00:00Z");

    private static final AtomicReference<Instant> CLOCK_INSTANT = new AtomicReference<>(NOW);

    private static final long EXPERIENCE = 1L;
    private static final long AUTHOR = 2L;

    @TestConfiguration
    static class MutableClockConfig {

        @Bean
        @Primary
        Clock mutableClock() {
            return new Clock() {

                @Override
                public ZoneId getZone() {
                    return ZoneOffset.UTC;
                }

                @Override
                public Clock withZone(ZoneId zone) {
                    return this;
                }

                @Override
                public Instant instant() {
                    return CLOCK_INSTANT.get();
                }
            };
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private UserCreditAccountMapper accountMapper;

    @Autowired
    private CreditLedgerMapper ledgerMapper;

    @AfterEach
    void resetClock() {
        CLOCK_INSTANT.set(NOW);
    }

    @Test
    void in_monthlyUsageNineteen_out_lastPointThenZero() throws Exception {
        // Given
        seedMonthlyUsage(AUTHOR, 19, "9");
        seedScore(AUTHOR, 90);

        // When
        likeWithNewUsers(5, 2001);
        likeWithNewUsers(5, 2006);

        // Then：第 5 档实发 +1 用满 20，第 10 档实发 0 仍留痕
        List<CreditLedgerEntity> rows = generatedRows(AUTHOR);
        assertAll(
                () -> assertEquals(91, score(AUTHOR), "only one point is applied"),
                () -> assertEquals(2, rows.size(), "both tiers leave a trace"),
                () -> assertEquals(1, rows.get(0).getAppliedDelta(), "tier 5 applies the last point"),
                () -> assertEquals(0, rows.get(1).getAppliedDelta(), "tier 10 is truncated to zero"));
    }

    @Test
    void in_monthlyUsageTwenty_out_zeroAppliedButLocked() throws Exception {
        // Given
        seedMonthlyUsage(AUTHOR, 20, "9");
        seedScore(AUTHOR, 95);

        // When
        likeWithNewUsers(5, 2101);

        // Then
        List<CreditLedgerEntity> rows = generatedRows(AUTHOR);
        assertAll(
                () -> assertEquals(95, score(AUTHOR), "score unchanged"),
                () -> assertEquals(1, rows.size(), "tier still booked"),
                () -> assertEquals(0, rows.getFirst().getAppliedDelta(), "applied delta is zero"));
    }

    @Test
    void in_crossBeijingMonthStart_out_quotaResets() throws Exception {
        // Given
        seedMonthlyUsage(AUTHOR, 19, "9");
        seedScore(AUTHOR, 90);
        likeWithNewUsers(5, 2201);

        // When：北京时间 2026-12-01 00:00，额度进入新月份
        CLOCK_INSTANT.set(DECEMBER_START);
        likeWithNewUsers(5, 2206);

        // Then
        List<CreditLedgerEntity> rows = generatedRows(AUTHOR);
        assertAll(
                () -> assertEquals(92, score(AUTHOR), "both months apply one point"),
                () -> assertEquals(2, rows.size(), "two tiers booked"),
                () -> assertEquals(1, rows.get(0).getAppliedDelta(), "November point applied"),
                () -> assertEquals(1, rows.get(1).getAppliedDelta(), "December quota restarts"),
                () -> assertEquals(NOW, Instant.parse(rows.get(0).getOccurredAt()), "first row in November"),
                () -> assertEquals(DECEMBER_START, Instant.parse(rows.get(1).getOccurredAt()), "second row in December"));
    }

    @Test
    void in_scoreAtUpperBound_out_capDoesNotConsumeQuota() throws Exception {
        // Given
        seedScore(AUTHOR, 100);

        // When
        likeWithNewUsers(5, 2301);

        // Then
        int monthlyApplied = generatedRows(AUTHOR).stream().mapToInt(CreditLedgerEntity::getAppliedDelta).sum();
        assertAll(
                () -> assertEquals(100, score(AUTHOR), "score stays at the upper bound"),
                () -> assertEquals(1, generatedRows(AUTHOR).size(), "tier is booked"),
                () -> assertEquals(0, generatedRows(AUTHOR).getFirst().getAppliedDelta(), "nothing applied"),
                () -> assertEquals(0, monthlyApplied, "monthly usage is not consumed"));
    }

    @Test
    void in_otherTripUsage_out_sharedMonthlyPool() throws Exception {
        // Given：另一条行程已用掉本月 19 点
        seedMonthlyUsage(AUTHOR, 19, "8");
        seedScore(AUTHOR, 90);

        // When
        likeWithNewUsers(5, 2401);
        likeWithNewUsers(5, 2406);

        // Then
        List<CreditLedgerEntity> rows = generatedRows(AUTHOR);
        assertAll(
                () -> assertEquals(91, score(AUTHOR), "shared monthly pool limits to twenty"),
                () -> assertEquals(1, rows.get(0).getAppliedDelta(), "last point available"),
                () -> assertEquals(0, rows.get(1).getAppliedDelta(), "next tier truncated"));
    }

    private void likeWithNewUsers(int count, long firstUserId) throws Exception {
        for (int index = 0; index < count; index++) {
            long userId = firstUserId + index;
            if (userMapper.selectById(userId) == null) {
                createUser(userId);
            }
            mockMvc.perform(post("/api/experiences/{id}/likes", EXPERIENCE).header("X-User-Id", userId))
                    .andExpect(status().isCreated());
        }
    }

    private void createUser(long id) {
        UserEntity user = new UserEntity();
        user.setId(id);
        user.setNickname("月度点赞者" + id);
        user.setAvatarInitial("赞");
        user.setSchool("");
        user.setBio("");
        user.setInterests("[]");
        user.setCreatedAt("2026-11-17T00:00:00Z");
        userMapper.insert(user);
    }

    private void seedScore(long userId, int score) {
        UserCreditAccountEntity account = accountMapper.selectById(userId);
        account.setScore(score);
        account.setUpdatedAt("2026-11-17T00:00:00Z");
        accountMapper.updateById(account);
    }

    /**
     * 直接写月度已用账本：{@code relatedId} 指向另一条行程，用于验证“共享月度池”。
     */
    private void seedMonthlyUsage(long userId, int count, String relatedId) {
        for (int index = 0; index < count; index++) {
            CreditLedgerEntity ledger = new CreditLedgerEntity();
            ledger.setId(9000L + index);
            ledger.setUserId(userId);
            ledger.setReasonCode(ExperienceLikeConstant.REASON_CODE);
            ledger.setAppliedDelta(1);
            ledger.setScoreBefore(60 + index);
            ledger.setScoreAfter(61 + index);
            ledger.setRelatedType(ExperienceLikeConstant.RELATED_TYPE);
            ledger.setRelatedId(relatedId);
            ledger.setOccurredAt("2026-11-05T04:00:00Z");
            ledgerMapper.insert(ledger);
        }
    }

    private int score(long userId) {
        UserCreditAccountEntity account = accountMapper.selectById(userId);
        return account == null ? 0 : account.getScore();
    }

    private List<CreditLedgerEntity> generatedRows(long userId) {
        return ledgerMapper.selectList(Wrappers.<CreditLedgerEntity>lambdaQuery()
                        .eq(CreditLedgerEntity::getUserId, userId)
                        .eq(CreditLedgerEntity::getReasonCode, ExperienceLikeConstant.REASON_CODE)
                        .orderByAsc(CreditLedgerEntity::getId)).stream()
                .filter(row -> row.getIdempotencyKey() != null)
                .toList();
    }
}
