package routeme.service.impl;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.time.Clock;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import lombok.extern.slf4j.Slf4j;
import routeme.constant.ProfileConstant;
import routeme.entity.UserEntity;
import routeme.enums.AccountStatusEnum;
import routeme.exception.InvalidProfileException;
import routeme.exception.UserNotFoundException;
import routeme.model.ProfileRules;
import routeme.pojo.AvatarFile;
import routeme.pojo.UserCredit;
import routeme.pojo.UserProfile;
import routeme.request.UserProfileUpdateRequest;
import routeme.service.AccountStatusService;
import routeme.service.CreditRestrictionGuard;
import routeme.service.CreditService;
import routeme.service.DemoUserService;
import routeme.service.NotificationService;
import routeme.service.UserProfileService;
import routeme.utils.JsonListUtils;

/**
 * 个人资料的业务实现：读时派生年龄 / 星座 / 完善状态，保存先校验后单次更新，头像落盘。
 * 方法契约以 {@link routeme.service.UserProfileService} 为准。
 */
@Slf4j
@Service
public class UserProfileServiceImpl implements UserProfileService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final DemoUserService demoUserService;
    private final AccountStatusService accountStatusService;
    private final CreditService creditService;
    private final CreditRestrictionGuard creditRestrictionGuard;
    private final NotificationService notificationService;
    private final Clock clock;
    private final Path avatarDirectory;

    public UserProfileServiceImpl(
            DemoUserService demoUserService,
            AccountStatusService accountStatusService,
            CreditService creditService,
            CreditRestrictionGuard creditRestrictionGuard,
            NotificationService notificationService,
            Clock clock,
            @Value("${routeme.profile.avatar-dir:../SqlLite/uploads/avatars}") String avatarDirectory) {
        this.demoUserService = demoUserService;
        this.accountStatusService = accountStatusService;
        this.creditService = creditService;
        this.creditRestrictionGuard = creditRestrictionGuard;
        this.notificationService = notificationService;
        this.clock = clock;
        this.avatarDirectory = Path.of(avatarDirectory).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.avatarDirectory);
        } catch (IOException exception) {
            throw new UncheckedIOException("cannot create avatar directory " + this.avatarDirectory, exception);
        }
    }

    @Override
    public UserProfile read(long targetUserId, long callerUserId) {
        return toProfile(requireEntity(targetUserId), targetUserId == callerUserId);
    }

    @Override
    @Transactional
    public UserProfile save(long userId, UserProfileUpdateRequest request) {
        creditRestrictionGuard.requireNotRestricted(userId);
        Map<String, String> fields = ProfileRules.validate(request, clock);
        if (!fields.isEmpty()) {
            throw new InvalidProfileException(fields);
        }
        UserEntity entity = requireEntity(userId);
        boolean wasComplete = isComplete(entity);
        List<String> interests = ProfileRules.normalizeInterests(request.interests());
        String nickname = ProfileRules.trimToEmpty(request.nickname());

        entity.setNickname(nickname);
        entity.setAvatarInitial(nickname.substring(0, 1));
        entity.setBirthday(ProfileRules.trimToEmpty(request.birthday()));
        entity.setGender(ProfileRules.trimToEmpty(request.gender()));
        entity.setCity(ProfileRules.trimToEmpty(request.city()));
        entity.setSchool(ProfileRules.trimToEmpty(request.school()));
        entity.setMajor(ProfileRules.trimToNull(request.major()));
        entity.setJob(ProfileRules.trimToNull(request.job()));
        entity.setMbti(ProfileRules.trimToNull(request.mbti()));
        entity.setInterests(JsonListUtils.write(interests));
        entity.setTravelStyle(ProfileRules.trimToEmpty(request.travelStyle()));
        entity.setBio(ProfileRules.trimToEmpty(request.bio()));

        demoUserService.update(Wrappers.<UserEntity>lambdaUpdate()
                .eq(UserEntity::getId, userId)
                .set(UserEntity::getNickname, entity.getNickname())
                .set(UserEntity::getAvatarInitial, entity.getAvatarInitial())
                .set(UserEntity::getBirthday, entity.getBirthday())
                .set(UserEntity::getGender, entity.getGender())
                .set(UserEntity::getCity, entity.getCity())
                .set(UserEntity::getSchool, entity.getSchool())
                .set(UserEntity::getMajor, entity.getMajor())
                .set(UserEntity::getJob, entity.getJob())
                .set(UserEntity::getMbti, entity.getMbti())
                .set(UserEntity::getInterests, entity.getInterests())
                .set(UserEntity::getTravelStyle, entity.getTravelStyle())
                .set(UserEntity::getBio, entity.getBio()));
        if (!wasComplete && isComplete(entity)) {
            notificationService.notifyIdentityVerified(userId);
        }
        return toProfile(entity, true);
    }

    @Override
    @Transactional
    public UserProfile uploadAvatar(long userId, MultipartFile file) {
        creditRestrictionGuard.requireNotRestricted(userId);
        UserEntity entity = requireEntity(userId);
        byte[] content = readBytes(file);
        if (content.length == 0) {
            throw new InvalidProfileException(Map.of("avatar", ProfileConstant.REASON_REQUIRED));
        }
        if (content.length > ProfileConstant.MAX_AVATAR_BYTES) {
            throw new InvalidProfileException(Map.of("avatar", ProfileConstant.REASON_OUT_OF_RANGE));
        }
        String extension = ProfileRules.avatarExtension(content);
        if (extension == null) {
            throw new InvalidProfileException(Map.of("avatar", ProfileConstant.REASON_INVALID_OPTION));
        }

        String fileName = userId + "-" + randomHex(8) + "." + extension;
        Path target = avatarDirectory.resolve(fileName);
        List<Path> previousFiles = avatarFiles(userId);
        try {
            Files.write(target, content);
        } catch (IOException exception) {
            throw new UncheckedIOException("cannot store avatar for user " + userId, exception);
        }

        String avatarUrl = "/api/users/" + userId + "/avatar?v=" + randomHex(4);
        demoUserService.update(Wrappers.<UserEntity>lambdaUpdate()
                .eq(UserEntity::getId, userId)
                .set(UserEntity::getAvatarUrl, avatarUrl));
        entity.setAvatarUrl(avatarUrl);
        deleteQuietly(previousFiles);
        return toProfile(entity, true);
    }

    @Override
    public Optional<AvatarFile> loadAvatar(long userId) {
        UserEntity entity = demoUserService.getById(userId);
        if (entity == null || entity.getAvatarUrl() == null || entity.getAvatarUrl().isBlank()) {
            return Optional.empty();
        }
        Path file = currentAvatarFile(userId);
        if (file == null) {
            return Optional.empty();
        }
        String contentType = contentTypeOf(file.getFileName().toString());
        if (contentType == null) {
            return Optional.empty();
        }
        try {
            return Optional.of(new AvatarFile(Files.readAllBytes(file), contentType));
        } catch (IOException exception) {
            log.warn("cannot read avatar file for user {}", userId);
            return Optional.empty();
        }
    }

    private UserEntity requireEntity(long userId) {
        UserEntity entity = demoUserService.getById(userId);
        if (entity == null) {
            throw new UserNotFoundException(userId);
        }
        return entity;
    }

    private boolean isComplete(UserEntity entity) {
        return ProfileRules.complete(
                entity.getNickname(),
                entity.getBirthday(),
                entity.getGender(),
                entity.getCity(),
                JsonListUtils.parse(entity.getInterests()),
                entity.getTravelStyle(),
                clock);
    }

    /**
     * @param includePrivate 本人视角：生日与限制原因只对本人返回；他人视角省略。
     */
    private UserProfile toProfile(UserEntity entity, boolean includePrivate) {
        List<String> interests = JsonListUtils.parse(entity.getInterests());
        boolean complete = ProfileRules.complete(
                entity.getNickname(),
                entity.getBirthday(),
                entity.getGender(),
                entity.getCity(),
                interests,
                entity.getTravelStyle(),
                clock);
// 封禁信息只在有效状态为 BANNED 时下发；到期 / 恢复后自动消失（design D4）。
        AccountStatusEnum effective = accountStatusService.effectiveStatus(entity);
        boolean banned = effective == AccountStatusEnum.BANNED;
        String status = effective.code();
        String banReasonCode = banned ? entity.getBanReasonCode() : null;
        String banExpiresAt = banned ? entity.getBanExpiresAt() : null;
        UserCredit credit = creditService.read(entity.getId());
        boolean restricted = credit.score() < 60;
        return new UserProfile(
                entity.getId(),
                entity.getNickname(),
                entity.getAvatarInitial(),
                entity.getAvatarUrl(),
                includePrivate ? entity.getBirthday() : null,
                ProfileRules.age(entity.getBirthday(), clock),
                ProfileRules.zodiac(entity.getBirthday()),
                entity.getGender(),
                ProfileRules.trimToNull(entity.getCity()),
                ProfileRules.trimToNull(entity.getSchool()),
                ProfileRules.trimToNull(entity.getMajor()),
                ProfileRules.trimToNull(entity.getJob()),
                ProfileRules.trimToNull(entity.getMbti()),
                interests,
                entity.getTravelStyle(),
                ProfileRules.trimToNull(entity.getBio()),
                complete,
                credit.score(),
                credit.level(),
                restricted,
                restricted && includePrivate ? "CREDIT_SCORE_BELOW_60" : null,
                status,
                banReasonCode,
                banExpiresAt);
    }

    private byte[] readBytes(MultipartFile file) {
        if (file == null) {
            return new byte[0];
        }
        try {
            return file.getBytes();
        } catch (IOException exception) {
            throw new UncheckedIOException("cannot read uploaded avatar", exception);
        }
    }

    private void deleteQuietly(List<Path> files) {
        for (Path file : files) {
            try {
                Files.deleteIfExists(file);
            } catch (IOException exception) {
                log.warn("cannot delete previous avatar file {}", file.getFileName());
            }
        }
    }

    /**
     * 当前头像文件：目录里以 {@code {userId}-} 开头的唯一文件；替换失败留下的孤儿文件取最新修改时间。
     */
    private Path currentAvatarFile(long userId) {
        Path best = null;
        long bestModified = Long.MIN_VALUE;
        for (Path candidate : avatarFiles(userId)) {
            long modified = lastModified(candidate);
            if (modified > bestModified) {
                best = candidate;
                bestModified = modified;
            }
        }
        return best;
    }

    /** 列出某用户已存在的头像文件；用于替换时清理旧文件。 */
    private List<Path> avatarFiles(long userId) {
        if (!Files.isDirectory(avatarDirectory)) {
            return List.of();
        }
        String prefix = userId + "-";
        try (Stream<Path> files = Files.list(avatarDirectory)) {
            return files.filter(Files::isRegularFile)
                    .filter(path -> path.getFileName().toString().startsWith(prefix))
                    .filter(path -> contentTypeOf(path.getFileName().toString()) != null)
                    .toList();
        } catch (IOException exception) {
            log.warn("cannot list avatar directory for user {}", userId);
            return List.of();
        }
    }

    private static long lastModified(Path file) {
        try {
            return Files.getLastModifiedTime(file).toMillis();
        } catch (IOException exception) {
            return 0L;
        }
    }

    private static String contentTypeOf(String fileName) {
        int dotIndex = fileName.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == fileName.length() - 1) {
            return null;
        }
        return ProfileConstant.AVATAR_CONTENT_TYPES.get(fileName.substring(dotIndex + 1).toLowerCase(Locale.ROOT));
    }

    private static String randomHex(int bytes) {
        byte[] buffer = new byte[bytes];
        RANDOM.nextBytes(buffer);
        return HexFormat.of().formatHex(buffer);
    }
}