package routeme.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import routeme.entity.UserEntity;
import routeme.exception.ForbiddenActionException;
import routeme.exception.SessionInvalidException;
import routeme.pojo.DemoUser;
import routeme.request.UserProfileUpdateRequest;
import routeme.response.UserProfileResponse;
import routeme.service.AuthService;
import routeme.service.DemoUserService;
import routeme.service.UserProfileService;
import routeme.service.UserProfileStatsService;

/**
 * 个人资料端点：读取用 {@code X-User-Id}，保存与上传用 Bearer；
 * 演示身份只读，尝试写入返回 403。
 */
@RestController
@RequestMapping("/api/users")
public class UserProfileController {

    private static final String BEARER_PREFIX = "Bearer ";
    private static final String AVATAR_CACHE_CONTROL = "public, max-age=31536000, immutable";

    private final UserProfileService userProfileService;
    private final UserProfileStatsService userProfileStatsService;
    private final DemoUserService demoUserService;
    private final AuthService authService;

    public UserProfileController(
            UserProfileService userProfileService,
            UserProfileStatsService userProfileStatsService,
            DemoUserService demoUserService,
            AuthService authService) {
        this.userProfileService = userProfileService;
        this.userProfileStatsService = userProfileStatsService;
        this.demoUserService = demoUserService;
        this.authService = authService;
    }

    @GetMapping("/{userId}/profile")
    public UserProfileResponse profile(
            @RequestHeader(value = "X-User-Id", required = false) Long callerId,
            @PathVariable long userId) {
        DemoUser caller = demoUserService.require(callerId);
        UserEntity target = demoUserService.getById(userId);
        return UserProfileResponse.from(
                userProfileService.read(userId, caller.id()),
                caller.id() == userId,
                target.getCreatedAt(),
                userProfileStatsService.stats(userId));
    }

    @PutMapping("/me/profile")
    public UserProfileResponse save(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId,
            @RequestBody UserProfileUpdateRequest request) {
        DemoUser user = requireSessionUser(authorization, headerUserId);
        return UserProfileResponse.from(userProfileService.save(user.id(), request), true);
    }

    @PostMapping("/me/avatar")
    public UserProfileResponse uploadAvatar(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId,
            @RequestParam("file") MultipartFile file) {
        DemoUser user = requireSessionUser(authorization, headerUserId);
        return UserProfileResponse.from(userProfileService.uploadAvatar(user.id(), file), true);
    }

    @GetMapping("/{userId}/avatar")
    public ResponseEntity<byte[]> avatar(@PathVariable long userId) {
        return userProfileService.loadAvatar(userId)
                .map(avatar -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(avatar.contentType()))
                        .header(HttpHeaders.CACHE_CONTROL, AVATAR_CACHE_CONTROL)
                        .body(avatar.content()))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * 会话优先：有效 token 决定写入身份；token 缺失或无效时，
     * 若 {@code X-User-Id} 指向演示账户（没有用户名凭据）则 403，否则 401。
     */
    private DemoUser requireSessionUser(String authorization, Long headerUserId) {
        try {
            return authService.requireUser(bearerToken(authorization));
        } catch (SessionInvalidException exception) {
            if (isDemoIdentity(headerUserId)) {
                throw new ForbiddenActionException("demo identity is read-only");
            }
            throw exception;
        }
    }

    private boolean isDemoIdentity(Long headerUserId) {
        if (headerUserId == null) {
            return false;
        }
        UserEntity entity = demoUserService.getById(headerUserId);
        return entity != null && entity.getUsername() == null;
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