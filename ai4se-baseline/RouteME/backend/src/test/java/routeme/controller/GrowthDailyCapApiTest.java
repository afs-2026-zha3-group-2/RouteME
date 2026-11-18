package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;

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
import org.springframework.transaction.annotation.Transactional;

import routeme.constant.GrowthConstant;
import routeme.entity.GrowthExpLedgerEntity;
import routeme.entity.UserGrowthAccountEntity;
import routeme.mapper.GrowthExpLedgerMapper;
import routeme.mapper.UserGrowthAccountMapper;
import routeme.pojo.GrowthBooking;
import routeme.service.GrowthService;

/**
 * 每日正向上限：达到 20 后实发 0 仍留痕、18 + 5 截断为 +2、北京时间日界重置。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(GrowthDailyCapApiTest.MutableClockConfig.class)
class GrowthDailyCapApiTest {

    private static final Instant NOW = Instant.parse("2026-11-18T04:00:00Z");
    private static final AtomicReference<Instant> CLOCK_INSTANT = new AtomicReference<>(NOW);

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
    private GrowthService growthService;

    @Autowired
    private UserGrowthAccountMapper accountMapper;

    @Autowired
    private GrowthExpLedgerMapper ledgerMapper;

    @AfterEach
    void resetClock() {
        CLOCK_INSTANT.set(NOW);
    }

    @Test
    void in_dailyLimitReached_out_zeroAppliedWithTrace() {
        // Given：两笔发布用满 20
        growthService.book(GrowthBooking.publish(1L, 101L, 10));
        growthService.book(GrowthBooking.publish(1L, 102L, 10));

        // When：当日再产生一笔点赞档位
        growthService.book(GrowthBooking.like(1L, 201L, 10));

        // Then
        List<GrowthExpLedgerEntity> rows = ledgerRows();
        assertAll(
                () -> assertEquals(20, expOf(1L), "daily total stays 20"),
                () -> assertEquals(3, rows.size(), "truncated event still leaves a trace"),
                () -> assertEquals(0, rows.get(2).getAppliedDelta(), "applied delta is zero"));
    }

    @Test
    void in_eighteenUsed_out_crossTierTruncatedToTwo() {
        // Given：当日已得 18
        seedUsage(1L, 18);

        // When：一笔 +5 的点赞档位达到
        growthService.book(GrowthBooking.like(1L, 202L, 10));

        // Then
        GrowthExpLedgerEntity last = ledgerRows().getLast();
        assertAll(
                () -> assertEquals(20, expOf(1L), "daily total reaches 20"),
                () -> assertEquals(2, last.getAppliedDelta(), "remaining quota is applied"),
                () -> assertEquals(18, last.getExpBefore(), "before snapshot"),
                () -> assertEquals(20, last.getExpAfter(), "after snapshot"));
    }

    @Test
    void in_utcSixteenHundred_out_newDayQuota() {
        // Given：北京时间 23:59 用满当日额度
        CLOCK_INSTANT.set(Instant.parse("2026-11-18T15:59:00Z"));
        growthService.book(GrowthBooking.publish(1L, 103L, 10));
        growthService.book(GrowthBooking.publish(1L, 104L, 10));

        // When：北京时间次日 00:00 再产生一笔
        CLOCK_INSTANT.set(Instant.parse("2026-11-18T16:00:00Z"));
        growthService.book(GrowthBooking.publish(1L, 105L, 10));

        // Then
        List<GrowthExpLedgerEntity> rows = ledgerRows();
        assertAll(
                () -> assertEquals(30, expOf(1L), "new day has its own quota"),
                () -> assertEquals(10, rows.get(2).getAppliedDelta(), "new day applies full delta"));
    }

    private void seedUsage(long userId, int applied) {
        UserGrowthAccountEntity account = accountMapper.selectById(userId);
        account.setExpTotal(applied);
        accountMapper.updateById(account);
        GrowthExpLedgerEntity row = new GrowthExpLedgerEntity();
        row.setId(9000L + userId);
        row.setUserId(userId);
        row.setReasonCode(GrowthConstant.REASON_LIKE);
        row.setAppliedDelta(applied);
        row.setExpBefore(0);
        row.setExpAfter(applied);
        row.setIdempotencyKey("seed-usage:" + userId);
        row.setOccurredAt(NOW.toString());
        ledgerMapper.insert(row);
    }

    private List<GrowthExpLedgerEntity> ledgerRows() {
        return ledgerMapper.selectList(null);
    }

    private int expOf(long userId) {
        return accountMapper.selectById(userId).getExpTotal();
    }
}
