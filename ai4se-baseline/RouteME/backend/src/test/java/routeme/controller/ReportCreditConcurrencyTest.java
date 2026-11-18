package routeme.controller;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.annotation.DirtiesContext;

import routeme.config.FixedClockTestConfig;
import routeme.pojo.Report;
import routeme.request.AdminReportResolveRequest;
import routeme.request.ReportRequest;
import routeme.service.AdminReportService;
import routeme.service.ReportService;

/**
 * A8：同一举报并发处理只生效一次。非事务测试，结束后重建上下文隔离脏数据。
 */
@SpringBootTest
@Import(FixedClockTestConfig.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class ReportCreditConcurrencyTest {

    private static final long REPORTED_USER = 3L;
    private static final long ADMIN_ID = 1001L;

    @Autowired
    private ReportService reportService;

    @Autowired
    private AdminReportService adminReportService;

    @Autowired
    private JdbcClient jdbcClient;

    private Long reportId;

    @AfterEach
    void cleanup() {
        if (reportId != null) {
            jdbcClient.sql("DELETE FROM credit_ledger WHERE related_id = :id AND related_type = 'REPORT'")
                    .param("id", String.valueOf(reportId)).update();
            jdbcClient.sql("DELETE FROM reports WHERE id = :id")
                    .param("id", reportId).update();
        }
        jdbcClient.sql("DELETE FROM credit_restriction WHERE user_id = :id")
                .param("id", REPORTED_USER).update();
        jdbcClient.sql("DELETE FROM user_credit_account WHERE user_id = :id")
                .param("id", REPORTED_USER).update();
    }

    @Test
    void concurrentResolve_onlyOneSucceedsAndOneLedgerRow() throws Exception {
        Report report = reportService.submit(
                1L, new ReportRequest("user", REPORTED_USER, "safety", null, null));
        reportId = report.id();
        adminReportService.start(reportId, ADMIN_ID);

        AtomicInteger success = new AtomicInteger();
        AtomicInteger conflict = new AtomicInteger();
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch go = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            for (int i = 0; i < 2; i++) {
                pool.submit(() -> {
                    ready.countDown();
                    try {
                        go.await(5, TimeUnit.SECONDS);
                        adminReportService.resolve(
                                reportId,
                                ADMIN_ID,
                                new AdminReportResolveRequest(
                                        "RESOLVED", "concurrent", "HARASSMENT", null));
                        success.incrementAndGet();
                    } catch (RuntimeException exception) {
                        conflict.incrementAndGet();
                    } catch (InterruptedException exception) {
                        Thread.currentThread().interrupt();
                    }
                });
            }
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            go.countDown();
            pool.shutdown();
            assertThat(pool.awaitTermination(20, TimeUnit.SECONDS)).isTrue();
        } finally {
            pool.shutdownNow();
        }

        assertThat(success.get()).isEqualTo(1);
        assertThat(conflict.get()).isEqualTo(1);
        Integer ledgerRows = jdbcClient.sql("""
                        SELECT COUNT(*) FROM credit_ledger
                        WHERE idempotency_key = :key
                        """)
                .param("key", "REPORT_VIOLATION:" + reportId)
                .query(Integer.class).single();
        assertThat(ledgerRows).isEqualTo(1);
        Integer score = jdbcClient.sql("SELECT score FROM user_credit_account WHERE user_id = :id")
                .param("id", REPORTED_USER).query(Integer.class).single();
        assertThat(score).isEqualTo(70);
    }
}
