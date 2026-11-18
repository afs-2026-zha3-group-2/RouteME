package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import routeme.entity.GrowthExpLedgerEntity;
import routeme.entity.UserGrowthAccountEntity;
import routeme.exception.ReportNotProcessingException;
import routeme.mapper.GrowthExpLedgerMapper;
import routeme.mapper.UserGrowthAccountMapper;
import routeme.pojo.Report;
import routeme.request.AdminReportResolveRequest;
import routeme.request.ReportRequest;
import routeme.service.AdminReportService;
import routeme.service.ReportService;

/**
 * 举报成立扣减经验：−50、最低 0、驳回不扣、重复处理至多一次。
 */
@SpringBootTest
@Transactional
class GrowthReportApiTest {

    private static final long REPORTED_USER = 3L;
    private static final long ADMIN_ID = 1001L;

    @Autowired
    private ReportService reportService;

    @Autowired
    private AdminReportService adminReportService;

    @Autowired
    private UserGrowthAccountMapper accountMapper;

    @Autowired
    private GrowthExpLedgerMapper ledgerMapper;

    @Test
    void in_resolved_out_fiftyDeductedOnce() {
        seedExp(120);

        Report report = resolve("RESOLVED", "HARASSMENT");
        assertAll(
                () -> assertEquals(70, expOf(), "50 deducted"),
                () -> assertEquals(1L, ledgerRows(), "one ledger row"));
        GrowthExpLedgerEntity row = ledgerMapper.selectList(null).getFirst();
        assertAll(
                () -> assertEquals(-50, row.getAppliedDelta(), "applied delta"),
                () -> assertEquals(120, row.getExpBefore(), "before snapshot"),
                () -> assertEquals("REPORT_VIOLATION", row.getReasonCode(), "reason"));

        assertThrows(ReportNotProcessingException.class,
                () -> adminReportService.resolve(report.id(), ADMIN_ID,
                        new AdminReportResolveRequest("RESOLVED", "重复处理", "HARASSMENT", null)));
        assertAll(
                () -> assertEquals(70, expOf(), "duplicate resolve does not deduct again"),
                () -> assertEquals(1L, ledgerRows(), "still one ledger row"));
    }

    @Test
    void in_rejected_out_noDeduction() {
        seedExp(120);

        resolve("REJECTED", null);

        assertAll(
                () -> assertEquals(120, expOf(), "rejected keeps exp"),
                () -> assertEquals(0L, ledgerRows(), "no ledger row"));
    }

    @Test
    void in_insufficientExp_out_clampedToZero() {
        seedExp(30);

        resolve("RESOLVED", "HARASSMENT");

        List<GrowthExpLedgerEntity> rows = ledgerMapper.selectList(null);
        assertAll(
                () -> assertEquals(0, expOf(), "clamped to zero"),
                () -> assertEquals(-30, rows.getFirst().getAppliedDelta(), "applied is the actual value"),
                () -> assertEquals(0, rows.getFirst().getExpAfter(), "never negative"));
    }

    private Report resolve(String outcome, String violationType) {
        Report report = reportService.submit(
                1L, new ReportRequest("user", REPORTED_USER, "safety", null, null));
        adminReportService.start(report.id(), ADMIN_ID);
        adminReportService.resolve(report.id(), ADMIN_ID,
                new AdminReportResolveRequest(outcome, "处理说明", violationType, null));
        return report;
    }

    private void seedExp(int exp) {
        UserGrowthAccountEntity account = accountMapper.selectById(REPORTED_USER);
        account.setExpTotal(exp);
        accountMapper.updateById(account);
    }

    private int expOf() {
        return accountMapper.selectById(REPORTED_USER).getExpTotal();
    }

    private long ledgerRows() {
        return ledgerMapper.selectCount(null);
    }
}
