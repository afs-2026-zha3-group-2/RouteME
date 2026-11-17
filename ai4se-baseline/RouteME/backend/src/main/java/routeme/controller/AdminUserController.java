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
import routeme.request.AdminUserStatusRequest;
import routeme.response.AdminUserDetailResponse;
import routeme.response.AdminUserSummaryResponse;
import routeme.response.PageResponse;
import routeme.service.AdminPrincipalService;
import routeme.service.AdminUserService;

/** 管理端用户管理：列表、详情与状态迁移。 */
@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final AdminPrincipalService adminPrincipalService;
    private final AdminUserService adminUserService;

    public AdminUserController(
            AdminPrincipalService adminPrincipalService, AdminUserService adminUserService) {
        this.adminPrincipalService = adminPrincipalService;
        this.adminUserService = adminUserService;
    }

    @GetMapping
    public PageResponse<AdminUserSummaryResponse> list(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size) {
        adminPrincipalService.requireAdmin(authorization);
        return PageResponse.from(adminUserService.list(
                q,
                status,
                page == null ? PageParam.DEFAULT_PAGE : page,
                size == null ? PageParam.DEFAULT_SIZE : size));
    }

    @GetMapping("/{userId}")
    public AdminUserDetailResponse detail(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable long userId) {
        adminPrincipalService.requireAdmin(authorization);
        return adminUserService.detail(userId);
    }

    @PostMapping("/{userId}/status")
    public AdminUserDetailResponse changeStatus(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable long userId,
            @RequestBody(required = false) AdminUserStatusRequest request) {
        DemoUser admin = adminPrincipalService.requireAdmin(authorization);
        return adminUserService.changeStatus(userId, admin.id(), request);
    }
}