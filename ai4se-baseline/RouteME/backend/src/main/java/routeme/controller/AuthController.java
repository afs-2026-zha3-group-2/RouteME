package routeme.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import routeme.exception.SessionInvalidException;
import routeme.pojo.AuthSession;
import routeme.pojo.DemoUser;
import routeme.request.AuthLoginRequest;
import routeme.request.AuthRegisterRequest;
import routeme.response.AuthSessionResponse;
import routeme.response.DemoUserResponse;
import routeme.service.AuthService;

/**
 * 账号认证端点：注册、登录、读取当前用户与退出。
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String BEARER_PREFIX = "Bearer ";

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthSessionResponse> register(@RequestBody AuthRegisterRequest request) {
        AuthSession session = authService.register(request);
        DemoUser user = authService.requireUser(session.token());
        return ResponseEntity.status(HttpStatus.CREATED).body(AuthSessionResponse.from(session, user));
    }

    @PostMapping("/login")
    public AuthSessionResponse login(@RequestBody AuthLoginRequest request) {
        AuthSession session = authService.login(request);
        DemoUser user = authService.requireUser(session.token());
        return AuthSessionResponse.from(session, user);
    }

    @GetMapping("/me")
    public DemoUserResponse me(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        return DemoUserResponse.from(authService.requireUser(bearerToken(authorization)));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        authService.logout(bearerToken(authorization));
        return ResponseEntity.noContent().build();
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