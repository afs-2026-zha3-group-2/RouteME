package routeme.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import routeme.enums.AccountRoleEnum;
import routeme.exception.SessionInvalidException;
import routeme.pojo.DemoUser;
import routeme.request.ServiceMessageRequest;
import routeme.response.ServiceMessageResponse;
import routeme.response.ServiceSessionDetailResponse;
import routeme.service.AdminPrincipalService;
import routeme.service.AuthService;
import routeme.service.CustomerService;

/**
 * 用户侧客服入口。所有身份来自 Bearer（design D17）；管理员对同一消息端点回复时
 * 由服务端判定 {@code sender_type=ADMIN}。
 */
@RestController
@RequestMapping("/api/service/sessions")
public class ServiceController {

    private static final String BEARER_PREFIX = "Bearer ";

    private final AuthService authService;
    private final AdminPrincipalService adminPrincipalService;
    private final CustomerService customerService;

    public ServiceController(
            AuthService authService,
            AdminPrincipalService adminPrincipalService,
            CustomerService customerService) {
        this.authService = authService;
        this.adminPrincipalService = adminPrincipalService;
        this.customerService = customerService;
    }

    @GetMapping("/current")
    public ResponseEntity<ServiceSessionDetailResponse> current(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        DemoUser user = authService.requireUser(bearerToken(authorization));
        return ResponseEntity.ok(customerService.current(user.id()).orElse(null));
    }

    @PostMapping
    public ServiceSessionDetailResponse create(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        DemoUser user = authService.requireUser(bearerToken(authorization));
        return customerService.createOrGet(user.id());
    }

    @GetMapping("/{sessionId}/messages")
    public ResponseEntity<List<ServiceMessageResponse>> messages(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable long sessionId) {
        DemoUser user = authService.requireUser(bearerToken(authorization));
        return customerService.listMessages(sessionId, user.id())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/{sessionId}/messages")
    public ResponseEntity<ServiceMessageResponse> send(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable long sessionId,
            @RequestBody(required = false) ServiceMessageRequest request) {
        DemoUser caller = authService.requireUser(bearerToken(authorization));
        if (AccountRoleEnum.ADMIN.code().equals(caller.role())) {
            adminPrincipalService.requireAdmin(authorization);
            return customerService.sendAdminMessage(
                            sessionId, caller.id(), request == null ? null : request.content())
                    .map(message -> ResponseEntity.status(HttpStatus.CREATED).body(message))
                    .orElseGet(() -> ResponseEntity.notFound().build());
        }
        return customerService.sendUserMessage(
                        sessionId, caller.id(), request == null ? null : request.content())
                .map(message -> ResponseEntity.status(HttpStatus.CREATED).body(message))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/{sessionId}/close")
    public ResponseEntity<ServiceSessionDetailResponse> close(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable long sessionId) {
        DemoUser user = authService.requireUser(bearerToken(authorization));
        return customerService.closeByUser(sessionId, user.id())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
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