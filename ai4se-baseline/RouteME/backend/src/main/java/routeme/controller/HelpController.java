package routeme.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import routeme.exception.SessionInvalidException;
import routeme.pojo.DemoUser;
import routeme.pojo.Report;
import routeme.response.HelpReportSummaryResponse;
import routeme.response.HelpReportsResponse;
import routeme.service.AuthService;
import routeme.service.ReportService;
import routeme.service.ReportTargetService;

/** 用户侧「我的举报」读取，身份来自 Bearer（design D17）。 */
@RestController
@RequestMapping("/api/help")
public class HelpController {

    private static final int MAX_ITEMS = 50;
    private static final String BEARER_PREFIX = "Bearer ";

    private final AuthService authService;
    private final ReportService reportService;
    private final ReportTargetService reportTargetService;

    public HelpController(
            AuthService authService,
            ReportService reportService,
            ReportTargetService reportTargetService) {
        this.authService = authService;
        this.reportService = reportService;
        this.reportTargetService = reportTargetService;
    }

    @GetMapping("/reports")
    public HelpReportsResponse reports(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        DemoUser user = authService.requireUser(bearerToken(authorization));
        List<HelpReportSummaryResponse> items = reportService.listMine(user.id(), MAX_ITEMS).stream()
                .map(this::summary)
                .toList();
        return new HelpReportsResponse(items, reportService.countMine(user.id()));
    }

    private HelpReportSummaryResponse summary(Report report) {
        return new HelpReportSummaryResponse(
                report.id(),
                "R-" + report.id(),
                report.targetType(),
                report.targetId(),
                reportTargetService.targetLabel(report),
                report.reason(),
                report.createdAt().toString(),
                report.status());
    }

    private static String bearerToken(String authorization) {
        if (authorization == null
                || !authorization.regionMatches(true, 0, BEARER_PREFIX, 0, BEARER_PREFIX.length())) {
            throw new SessionInvalidException("missing Authorization: Bearer header");
        }
        String token = authorization.substring(BEARER_PREFIX.length()).trim();
        if (token.isEmpty()) {
            throw new SessionInvalidException("empty bearer token");
        }
        return token;
    }
}