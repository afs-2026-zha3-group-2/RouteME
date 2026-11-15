package routeme.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import routeme.dto.ReportReceiptResponse;
import routeme.dto.ReportRequest;
import routeme.model.DemoUser;
import routeme.service.DemoUserService;
import routeme.service.ReportService;

@RestController
@RequestMapping("/api")
public class ReportController {

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
}