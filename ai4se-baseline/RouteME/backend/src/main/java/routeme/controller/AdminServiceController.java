package routeme.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import routeme.param.PageParam;
import routeme.pojo.DemoUser;
import routeme.response.PageResponse;
import routeme.response.ServiceSessionDetailResponse;
import routeme.response.ServiceSessionSummaryResponse;
import routeme.service.AdminPrincipalService;
import routeme.service.CustomerService;

/** 管理端客服工作台。 */
@RestController
@RequestMapping("/api/admin/service/sessions")
public class AdminServiceController {

    private final AdminPrincipalService adminPrincipalService;
    private final CustomerService customerService;

    public AdminServiceController(
            AdminPrincipalService adminPrincipalService, CustomerService customerService) {
        this.adminPrincipalService = adminPrincipalService;
        this.customerService = customerService;
    }

    @GetMapping
    public PageResponse<ServiceSessionSummaryResponse> list(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size) {
        adminPrincipalService.requireAdmin(authorization);
        return PageResponse.from(customerService.adminList(
                status,
                page == null ? PageParam.DEFAULT_PAGE : page,
                size == null ? PageParam.DEFAULT_SIZE : size));
    }

    @GetMapping("/{sessionId}")
    public ResponseEntity<ServiceSessionDetailResponse> detail(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable long sessionId) {
        adminPrincipalService.requireAdmin(authorization);
        return customerService.adminDetail(sessionId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/{sessionId}/join")
    public ResponseEntity<ServiceSessionDetailResponse> join(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable long sessionId) {
        DemoUser admin = adminPrincipalService.requireAdmin(authorization);
        return customerService.join(sessionId, admin.id())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/{sessionId}/resolve")
    public ResponseEntity<ServiceSessionDetailResponse> resolve(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable long sessionId) {
        DemoUser admin = adminPrincipalService.requireAdmin(authorization);
        return customerService.resolve(sessionId, admin.id())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}