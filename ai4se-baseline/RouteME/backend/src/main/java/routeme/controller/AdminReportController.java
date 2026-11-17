package routeme.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import routeme.param.PageParam;
import routeme.pojo.DemoUser;
import routeme.request.AdminReportResolveRequest;
import routeme.response.AdminReportDetailResponse;
import routeme.response.AdminReportSummaryResponse;
import routeme.response.PageResponse;
import routeme.service.AdminPrincipalService;
import routeme.service.AdminReportService;

/** 管理端举报队列与处理。 */
@RestController
@RequestMapping("/api/admin/reports")
public class AdminReportController {

    private final AdminPrincipalService adminPrincipalService;
    private final AdminReportService adminReportService;

    public AdminReportController(
            AdminPrincipalService adminPrincipalService, AdminReportService adminReportService) {
        this.adminPrincipalService = adminPrincipalService;
        this.adminReportService = adminReportService;
    }

    @GetMapping
    public PageResponse<AdminReportSummaryResponse> list(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size) {
        adminPrincipalService.requireAdmin(authorization);
        return PageResponse.from(adminReportService.list(
                status,
                page == null ? PageParam.DEFAULT_PAGE : page,
                size == null ? PageParam.DEFAULT_SIZE : size));
    }

    @GetMapping("/{reportId}")
    public AdminReportDetailResponse detail(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable long reportId) {
        adminPrincipalService.requireAdmin(authorization);
        return adminReportService.detail(reportId);
    }

    @PostMapping("/{reportId}/start")
    public AdminReportDetailResponse start(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable long reportId) {
        DemoUser admin = adminPrincipalService.requireAdmin(authorization);
        return adminReportService.start(reportId, admin.id());
    }

    @PostMapping("/{reportId}/resolve")
    public AdminReportDetailResponse resolve(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable long reportId,
            @RequestBody(required = false) AdminReportResolveRequest request) {
        DemoUser admin = adminPrincipalService.requireAdmin(authorization);
        return adminReportService.resolve(reportId, admin.id(), request);
    }
}