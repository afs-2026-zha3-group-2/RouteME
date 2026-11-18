package routeme.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import routeme.pojo.DemoUser;
import routeme.request.ReportRequest;
import routeme.response.MyReportResponse;
import routeme.response.ReportReceiptResponse;
import routeme.service.DemoUserService;
import routeme.service.ReportService;

@RestController
@RequestMapping("/api")
public class ReportController {

    /** 与通知中心列表上限一致：举报详情页只回溯最近的记录。 */
    private static final int MAX_MY_REPORTS = 50;

    private final DemoUserService demoUserService;
    private final ReportService reportService;

    public ReportController(DemoUserService demoUserService, ReportService reportService) {
        this.demoUserService = demoUserService;
        this.reportService = reportService;
    }

    @PostMapping("/reports")
    public ResponseEntity<ReportReceiptResponse> submit(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestBody ReportRequest request) {
        DemoUser reporter = demoUserService.require(userId);
        reportService.submit(reporter.id(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ReportReceiptResponse(true));
    }

    /**
     * 当前用户提交过的举报，供通知跳转的举报详情页使用。
     *
     * <p>不返回管理员备注与处理人，避免把后台自由文本或他人处罚细节带到前台。</p>
     */
    @GetMapping("/reports/mine")
    public List<MyReportResponse> mine(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestParam(name = "limit", required = false) Integer limit) {
        DemoUser reporter = demoUserService.require(userId);
        int size = limit == null ? MAX_MY_REPORTS : Math.min(Math.max(limit, 1), MAX_MY_REPORTS);
        return reportService.listMine(reporter.id(), size).stream()
                .map(MyReportResponse::from)
                .toList();
    }
}