package routeme.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import routeme.response.AdminDashboardResponse;
import routeme.service.AdminDashboardService;
import routeme.service.AdminPrincipalService;

/** 管理端概览：单个只读端点，结果为即时快照且不缓存。 */
@RestController
@RequestMapping("/api/admin/dashboard")
public class AdminDashboardController {

    private final AdminPrincipalService adminPrincipalService;
    private final AdminDashboardService adminDashboardService;

    public AdminDashboardController(
            AdminPrincipalService adminPrincipalService, AdminDashboardService adminDashboardService) {
        this.adminPrincipalService = adminPrincipalService;
        this.adminDashboardService = adminDashboardService;
    }

    @GetMapping
    public ResponseEntity<AdminDashboardResponse> overview(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        adminPrincipalService.requireAdmin(authorization);
        return ResponseEntity.ok()
                .header("Cache-Control", "no-store")
                .body(adminDashboardService.overview());
    }
}