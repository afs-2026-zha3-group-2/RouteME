package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;

import routeme.entity.UserGrowthAccountEntity;
import routeme.mapper.UserGrowthAccountMapper;
import routeme.pojo.GrowthBooking;
import routeme.service.GrowthService;

/**
 * 并发与幂等兜底：同一幂等键并发只结算一次；唯一键冲突视为已结算，不做二次扣发。
 * 非事务用例：线程各自提交，结束后按用户清理成长两表。
 */
@SpringBootTest
class GrowthConcurrencyTest {

    private static final long AUTHOR = 9101L;
    private static final int THREADS = 8;

    @Autowired
    private GrowthService growthService;

    @Autowired
    private UserGrowthAccountMapper accountMapper;

    @Autowired
    private JdbcClient jdbcClient;

    @AfterEach
    void cleanUp() {
        jdbcClient.sql("DELETE FROM growth_exp_ledger WHERE user_id = :userId")
                .param("userId", AUTHOR)
                .update();
        jdbcClient.sql("DELETE FROM user_growth_account WHERE user_id = :userId")
                .param("userId", AUTHOR)
                .update();
    }

    @Test
    void in_concurrentLikeSameTier_out_oneLedgerRowAndOneGrant() throws Exception {
        runConcurrently(() -> growthService.book(GrowthBooking.like(AUTHOR, 91001L, 10)));

        assertAll(
                () -> assertEquals(5, expOf(), "only one tier grant"),
                () -> assertEquals(1L, ledgerRows(), "one ledger row"));
    }

    @Test
    void in_concurrentReport_out_oneDeduction() throws Exception {
        cleanUp();
        seedExp(120);
        runConcurrently(() -> growthService.book(GrowthBooking.report(AUTHOR, 91002L)));

        assertAll(
                () -> assertEquals(70, expOf(), "only one 50 deduction"),
                () -> assertEquals(1L, ledgerRows(), "one ledger row"));
    }

    @Test
    void in_concurrentPublishOut_oneGrant() throws Exception {
        runConcurrently(() -> growthService.book(GrowthBooking.publish(AUTHOR, 91003L, 10)));

        assertAll(
                () -> assertEquals(10, expOf(), "only one publish grant"),
                () -> assertEquals(1L, ledgerRows(), "one ledger row"));
    }

    private void runConcurrently(Runnable action) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(THREADS);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<?>> futures = new ArrayList<>();
        try {
            for (int index = 0; index < THREADS; index++) {
                futures.add(pool.submit(() -> {
                    start.await();
                    action.run();
                    return null;
                }));
            }
            start.countDown();
            for (Future<?> future : futures) {
                future.get(30, TimeUnit.SECONDS);
            }
        } finally {
            pool.shutdownNow();
        }
    }

    private void seedExp(int exp) {
        UserGrowthAccountEntity entity = new UserGrowthAccountEntity();
        entity.setUserId(AUTHOR);
        entity.setExpTotal(exp);
        entity.setCreatedAt("2026-11-18T00:00:00Z");
        entity.setUpdatedAt("2026-11-18T00:00:00Z");
        accountMapper.insert(entity);
    }

    private int expOf() {
        UserGrowthAccountEntity account = accountMapper.selectById(AUTHOR);
        assertNotNull(account, "account exists");
        return account.getExpTotal();
    }

    private long ledgerRows() {
        return jdbcClient.sql("SELECT COUNT(*) FROM growth_exp_ledger WHERE user_id = :userId")
                .param("userId", AUTHOR)
                .query(Long.class)
                .single();
    }
}
