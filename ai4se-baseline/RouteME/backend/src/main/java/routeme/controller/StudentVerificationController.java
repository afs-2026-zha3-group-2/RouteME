package routeme.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import routeme.exception.SessionInvalidException;
import routeme.pojo.DemoUser;
import routeme.request.StudentVerificationRequest;
import routeme.response.DemoUserResponse;
import routeme.service.AuthService;
import routeme.service.StudentVerificationService;

/**
 * 学信网学籍认证端点：必须携带有效 Bearer 会话，响应返回更新后的用户摘要，
 * 前端据此即时解除核心动作门槛。
 */
@RestController
@RequestMapping("/api/users/me/student-verification")
public class StudentVerificationController {

    private static final String BEARER_PREFIX = "Bearer ";

    private final AuthService authService;
    private final StudentVerificationService studentVerificationService;

    public StudentVerificationController(
            AuthService authService,
            StudentVerificationService studentVerificationService) {
        this.authService = authService;
        this.studentVerificationService = studentVerificationService;
    }

    @PostMapping
    public DemoUserResponse verify(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody StudentVerificationRequest request) {
        DemoUser user = authService.requireUser(bearerToken(authorization));
        return DemoUserResponse.from(studentVerificationService.verify(user.id(), request));
    }

    private static String bearerToken(String authorization) {
        if (authorization == null || !authorization.regionMatches(true, 0, BEARER_PREFIX, 0, BEARER_PREFIX.length())) {
            throw new SessionInvalidException("missing Authorization: Bearer header");
        }
        String token = authorization.substring(BEARER_PREFIX.length()).trim();
        if (token.isEmpty()) {
            throw new SessionInvalidException("empty bearer token");
        }
        return token;
    }
}
