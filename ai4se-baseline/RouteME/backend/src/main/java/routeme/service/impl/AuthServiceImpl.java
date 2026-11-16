package routeme.service.impl;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import routeme.constant.AuthConstant;
import routeme.entity.AuthSessionEntity;
import routeme.entity.UserEntity;
import routeme.exception.InvalidCredentialsException;
import routeme.exception.InvalidInputException;
import routeme.exception.SessionInvalidException;
import routeme.exception.UsernameTakenException;
import routeme.mapper.AuthSessionMapper;
import routeme.pojo.AuthSession;
import routeme.pojo.DemoUser;
import routeme.pojo.UserAccount;
import routeme.request.AuthLoginRequest;
import routeme.request.AuthRegisterRequest;
import routeme.service.AuthService;
import routeme.service.DemoUserService;
import routeme.utils.PasswordUtils;

/**
 * 认证的业务实现：注册校验、密码校验与不透明 token 会话。
 * 用户表写入委托给 {@link DemoUserService}，本类只拥有 auth_sessions。
 * 方法契约以 {@link routeme.service.AuthService} 为准。
 */
@Service
public class AuthServiceImpl extends AbstractServiceImpl<AuthSessionMapper, AuthSessionEntity>
        implements AuthService {

    private static final Pattern USERNAME = Pattern.compile(AuthConstant.USERNAME_PATTERN);

    private final DemoUserService demoUserService;
    private final Clock clock;

    public AuthServiceImpl(DemoUserService demoUserService, Clock clock) {
        this.demoUserService = demoUserService;
        this.clock = clock;
    }

    @Override
    @Transactional
    public AuthSession register(AuthRegisterRequest request) {
        if (request == null) {
            throw new InvalidInputException("request body is required");
        }
        String username = normalizeUsername(request.username());
        String password = requirePassword(request.password());
        String nickname = requireNickname(request.nickname());
        String school = requireSchool(request.school());
        String bio = optionalText(request.bio(), "bio", AuthConstant.MAX_BIO_LENGTH);
        List<String> interests = cleanInterests(request.interests());
        String avatarInitial = avatarInitial(request.avatarInitial(), nickname);
        if (demoUserService.findByUsername(username).isPresent()) {
            throw new UsernameTakenException("username already registered: " + username);
        }
        DemoUser user = demoUserService.createAccount(
                username,
                PasswordUtils.hash(password),
                nickname,
                avatarInitial,
                school,
                bio,
                interests);
        return issue(user.id());
    }

    @Override
    public AuthSession login(AuthLoginRequest request) {
        if (request == null) {
            throw new InvalidCredentialsException("username and password are required");
        }
        String username = normalizeLoginName(request.username());
        String password = request.password();
        if (username.isEmpty() || password == null || password.isEmpty()) {
            throw new InvalidCredentialsException("username and password are required");
        }
        UserAccount account = demoUserService.findByUsername(username)
                .orElseThrow(() -> new InvalidCredentialsException("unknown account"));
        if (!PasswordUtils.matches(password, account.passwordHash())) {
            throw new InvalidCredentialsException("password does not match");
        }
        return issue(account.id());
    }

    @Override
    public DemoUser requireUser(String token) {
        AuthSession session = requireSession(token);
        UserEntity entity = demoUserService.getById(session.userId());
        if (entity == null) {
            throw new SessionInvalidException("account no longer exists");
        }
        return entity.toDemoUser();
    }

    @Override
    public void logout(String token) {
        if (token != null && !token.isBlank() && getById(token) != null) {
            removeById(token);
        }
    }

    private AuthSession issue(long userId) {
        Instant now = clock.instant();
        Instant expiresAt = now.plus(AuthConstant.SESSION_TTL_DAYS, ChronoUnit.DAYS);
        AuthSessionEntity entity = new AuthSessionEntity();
        entity.setToken(PasswordUtils.newToken());
        entity.setUserId(userId);
        entity.setCreatedAt(now.toString());
        entity.setExpiresAt(expiresAt.toString());
        save(entity);
        return new AuthSession(entity.getToken(), userId, now, expiresAt);
    }

    private AuthSession requireSession(String token) {
        if (token == null || token.isBlank()) {
            throw new SessionInvalidException("missing bearer token");
        }
        AuthSessionEntity entity = getById(token);
        if (entity == null) {
            throw new SessionInvalidException("unknown bearer token");
        }
        Instant expiresAt = Instant.parse(entity.getExpiresAt());
        if (!expiresAt.isAfter(clock.instant())) {
            removeById(token);
            throw new SessionInvalidException("bearer token expired");
        }
        return new AuthSession(entity.getToken(), entity.getUserId(), Instant.parse(entity.getCreatedAt()), expiresAt);
    }

    private static String normalizeUsername(String raw) {
        String username = raw == null ? "" : raw.trim();
        if (!USERNAME.matcher(username).matches()) {
            throw new InvalidInputException("username must be 3-20 letters, digits or underscores");
        }
        return username.toLowerCase(Locale.ROOT);
    }

    private static String normalizeLoginName(String raw) {
        return raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
    }

    private static String requirePassword(String raw) {
        if (raw == null
                || raw.length() < AuthConstant.MIN_PASSWORD_LENGTH
                || raw.length() > AuthConstant.MAX_PASSWORD_LENGTH) {
            throw new InvalidInputException(
                    "password must be " + AuthConstant.MIN_PASSWORD_LENGTH + "-"
                            + AuthConstant.MAX_PASSWORD_LENGTH + " characters");
        }
        return raw;
    }

    private static String requireNickname(String raw) {
        String nickname = raw == null ? "" : raw.trim();
        if (nickname.isEmpty() || nickname.length() > AuthConstant.MAX_NICKNAME_LENGTH) {
            throw new InvalidInputException(
                    "nickname must be 1-" + AuthConstant.MAX_NICKNAME_LENGTH + " characters");
        }
        return nickname;
    }

    private static String requireSchool(String raw) {
        String school = raw == null ? "" : raw.trim();
        if (school.isEmpty()) {
            throw new InvalidInputException("school is required");
        }
        if (school.length() > AuthConstant.MAX_SCHOOL_LENGTH) {
            throw new InvalidInputException(
                    "school must be at most " + AuthConstant.MAX_SCHOOL_LENGTH + " characters");
        }
        return school;
    }

    private static String optionalText(String raw, String field, int maxLength) {
        if (raw == null || raw.isBlank()) {
            return "";
        }
        String trimmed = raw.trim();
        if (trimmed.length() > maxLength) {
            throw new InvalidInputException(field + " must be at most " + maxLength + " characters");
        }
        return trimmed;
    }

    private static List<String> cleanInterests(List<String> values) {
        if (values == null) {
            return List.of();
        }
        LinkedHashSet<String> cleaned = new LinkedHashSet<>();
        for (String value : values) {
            if (value == null || value.isBlank()) {
                continue;
            }
            String trimmed = value.trim();
            if (trimmed.length() > AuthConstant.MAX_INTEREST_LENGTH) {
                throw new InvalidInputException(
                        "interest must be at most " + AuthConstant.MAX_INTEREST_LENGTH + " characters");
            }
            cleaned.add(trimmed);
        }
        if (cleaned.size() > AuthConstant.MAX_INTERESTS) {
            throw new InvalidInputException("at most " + AuthConstant.MAX_INTERESTS + " interests are allowed");
        }
        return List.copyOf(new ArrayList<>(cleaned));
    }

    private static String avatarInitial(String raw, String nickname) {
        if (raw != null && !raw.isBlank()) {
            String trimmed = raw.trim();
            return trimmed.length() > 4 ? trimmed.substring(0, 4) : trimmed;
        }
        return nickname.substring(0, 1);
    }
}