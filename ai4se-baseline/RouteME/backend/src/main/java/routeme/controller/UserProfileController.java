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
import routeme.exception.UserNotFoundException;
import routeme.pojo.DemoUser;
import routeme.pojo.UserGrowth;
import routeme.pojo.UserProfile;
import routeme.request.UserProfileUpdateRequest;
import routeme.response.UserCreditResponse;
import routeme.response.UserGrowthEntryResponse;
import routeme.response.UserGrowthResponse;
import routeme.response.UserProfileResponse;
import routeme.service.AuthService;
import routeme.service.CreditService;
import routeme.service.DemoUserService;
import routeme.service.GrowthService;
import routeme.service.TripRouteCompletionService;
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
    private static final int MAX_GROWTH_IDS = 50;

    private final UserProfileService userProfileService;
    private final UserProfileStatsService userProfileStatsService;
    private final DemoUserService demoUserService;
    private final AuthService authService;
    private final CreditService creditService;
    private final GrowthService growthService;
    private final TripRouteCompletionService tripRouteCompletionService;

    public UserProfileController(
            UserProfileService userProfileService,
            UserProfileStatsService userProfileStatsService,
            DemoUserService demoUserService,
            AuthService authService,
            CreditService creditService,
            GrowthService growthService,
            TripRouteCompletionService tripRouteCompletionService) {
        this.userProfileService = userProfileService;
        this.userProfileStatsService = userProfileStatsService;
        this.demoUserService = demoUserService;
        this.authService = authService;
        this.creditService = creditService;
        this.growthService = growthService;
        this.tripRouteCompletionService = tripRouteCompletionService;
    }

    @GetMapping("/{userId}/profile")
    public UserProfileResponse profile(
            @RequestHeader(value = "X-User-Id", required = false) Long callerId,
            @PathVariable long userId) {
        DemoUser caller = demoUserService.require(callerId);
        UserEntity target = demoUserService.getById(userId);
        boolean self = caller.id() == userId;
        UserProfile profile = userProfileService.read(userId, caller.id());
        UserGrowth growth = growthService.read(userId);
        return UserProfileResponse.from(
                profile,
                self,
                target.getCreatedAt(),
                userProfileStatsService.stats(userId),
                UserGrowthResponse.from(growth, self, self ? growthService.positiveExpToday(userId) : null),
                tripRouteCompletionService.evaluate(userId));
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
        return parseIds(raw, MAX_CREDIT_IDS);
    }

    private static List<Long> parseGrowthIds(String raw) {
        return parseIds(raw, MAX_GROWTH_IDS);
    }

    private static List<Long> parseIds(String raw, int maxIds) {
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
        if (ids.size() > maxIds) {
            throw new InvalidInputException("at most " + maxIds + " ids per request");
        }
        return ids.stream().distinct().toList();
    }

    /**
     * 批量成长等级：只返回 level；任一 id 不存在时 404，不建孤立账户。
     */
    @GetMapping("/growth")
    public List<UserGrowthEntryResponse> growth(
            @RequestHeader(value = "X-User-Id", required = false) Long callerId,
            @RequestParam(value = "ids", required = false) String ids) {
        demoUserService.require(callerId);
        List<Long> parsed = parseGrowthIds(ids);
        for (Long id : parsed) {
            if (demoUserService.getById(id) == null) {
                throw new UserNotFoundException(id);
            }
        }
        return growthService.readAll(parsed).stream()
                .map(UserGrowthEntryResponse::from)
                .toList();
    }

    @PutMapping("/me/profile")
    public UserProfileResponse save(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody UserProfileUpdateRequest request) {
        DemoUser user = requireSessionUser(authorization);
        return UserProfileResponse.from(
                userProfileService.save(user.id(), request),
                true,
                tripRouteCompletionService.evaluate(user.id()));
    }

    @PostMapping("/me/avatar")
    public UserProfileResponse uploadAvatar(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam("file") MultipartFile file) {
        DemoUser user = requireSessionUser(authorization);
        return UserProfileResponse.from(
                userProfileService.uploadAvatar(user.id(), file),
                true,
                tripRouteCompletionService.evaluate(user.id()));
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