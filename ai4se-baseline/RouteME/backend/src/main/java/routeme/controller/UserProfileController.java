package routeme.controller;

import java.util.ArrayList;
import java.util.List;

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
import routeme.exception.InvalidInputException;
import routeme.exception.SessionInvalidException;
import routeme.pojo.DemoUser;
import routeme.request.UserProfileUpdateRequest;
import routeme.response.UserCreditResponse;
import routeme.response.UserProfileResponse;
import routeme.service.AuthService;
import routeme.service.CreditService;
import routeme.service.DemoUserService;
import routeme.service.UserProfileService;
import routeme.service.UserProfileStatsService;

/**
 * 个人资料端点：读取用 {@code X-User-Id}，保存与上传必须携带有效 Bearer 会话。
 */
@RestController
@RequestMapping("/api/users")
public class UserProfileController {

    private static final String BEARER_PREFIX = "Bearer ";
    private static final String AVATAR_CACHE_CONTROL = "public, max-age=31536000, immutable";
    /** 批量取数的上限：一页卡片的规模，避免被当成全量接口使用。 */
    private static final int MAX_CREDIT_IDS = 50;

    private final UserProfileService userProfileService;
    private final UserProfileStatsService userProfileStatsService;
    private final DemoUserService demoUserService;
    private final AuthService authService;
    private final CreditService creditService;

    public UserProfileController(
            UserProfileService userProfileService,
            UserProfileStatsService userProfileStatsService,
            DemoUserService demoUserService,
            AuthService authService,
            CreditService creditService) {
        this.userProfileService = userProfileService;
        this.userProfileStatsService = userProfileStatsService;
        this.demoUserService = demoUserService;
        this.authService = authService;
        this.creditService = creditService;
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

    /**
     * 批量信用状态：卡片 / 申请列表 / 详情页发布者共用；只返回分数与等级码。
     */
    @GetMapping("/credits")
    public List<UserCreditResponse> credits(
            @RequestHeader(value = "X-User-Id", required = false) Long callerId,
            @RequestParam(value = "ids", required = false) String ids) {
        demoUserService.require(callerId);
        return creditService.readAll(parseCreditIds(ids)).stream()
                .map(UserCreditResponse::from)
                .toList();
    }

    private static List<Long> parseCreditIds(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new InvalidInputException("ids is required");
        }
        List<Long> ids = new ArrayList<>();
        for (String part : raw.split(",")) {
            String trimmed = part.trim();
            if (trimmed.isEmpty()) {
                continue;
            }
            try {
                ids.add(Long.parseLong(trimmed));
            } catch (NumberFormatException exception) {
                throw new InvalidInputException("ids must be a comma-separated list of numbers");
            }
        }
        if (ids.isEmpty()) {
            throw new InvalidInputException("ids is required");
        }
        if (ids.size() > MAX_CREDIT_IDS) {
            throw new InvalidInputException("at most " + MAX_CREDIT_IDS + " ids per request");
        }
        return ids.stream().distinct().toList();
    }

    @PutMapping("/me/profile")
    public UserProfileResponse save(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody UserProfileUpdateRequest request) {
        DemoUser user = requireSessionUser(authorization);
        return UserProfileResponse.from(userProfileService.save(user.id(), request), true);
    }

    @PostMapping("/me/avatar")
    public UserProfileResponse uploadAvatar(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam("file") MultipartFile file) {
        DemoUser user = requireSessionUser(authorization);
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
     * 写入必须以有效 Bearer 会话为身份；缺失或无效时由 {@link SessionInvalidException} 返回 401。
     */
    private DemoUser requireSessionUser(String authorization) {
        return authService.requireUser(bearerToken(authorization));
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