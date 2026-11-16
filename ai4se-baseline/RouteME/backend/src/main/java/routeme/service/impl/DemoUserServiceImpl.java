package routeme.service.impl;

import java.time.Clock;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import routeme.exception.DemoUserRequiredException;
import routeme.mapper.UserMapper;
import routeme.pojo.DemoUser;
import routeme.pojo.UserAccount;
import routeme.entity.UserEntity;
import routeme.service.DemoUserService;
import routeme.utils.JsonListUtils;

/**
 * 演示账户的持久化实现：账户列表与 {@code X-User-Id} 解析。
 * 方法契约以 {@link routeme.service.DemoUserService} 为准。
 */
@Service
public class DemoUserServiceImpl extends AbstractServiceImpl<UserMapper, UserEntity>
        implements DemoUserService {

    private final Clock clock;

    public DemoUserServiceImpl(Clock clock) {
        this.clock = clock;
    }

    @Override
    public List<DemoUser> findAll() {
        return list(Wrappers.<UserEntity>lambdaQuery().orderByAsc(UserEntity::getId)).stream()
                .map(UserEntity::toDemoUser)
                .toList();
    }

    @Override
    public List<DemoUser> findAllDemo() {
        return list(Wrappers.<UserEntity>lambdaQuery()
                .isNull(UserEntity::getUsername)
                .orderByAsc(UserEntity::getId)).stream()
                .map(UserEntity::toDemoUser)
                .toList();
    }

    @Override
    public DemoUser require(Long userId) {
        if (userId == null) {
            throw new DemoUserRequiredException("missing X-User-Id header");
        }
        UserEntity entity = getById(userId);
        if (entity == null) {
            throw new DemoUserRequiredException("unknown demo user: " + userId);
        }
        return entity.toDemoUser();
    }

    @Override
    public long nextUserId() {
        return nextId(UserEntity::getId);
    }

    @Override
    public Optional<UserAccount> findByUsername(String username) {
        if (username == null || username.isBlank()) {
            return Optional.empty();
        }
        UserEntity entity = getOne(
                Wrappers.<UserEntity>lambdaQuery().eq(UserEntity::getUsername, username), false);
        return Optional.ofNullable(entity).map(UserEntity::toUserAccount);
    }

    @Override
    @Transactional
    public DemoUser createAccount(
            String username,
            String passwordHash,
            String nickname,
            String avatarInitial,
            String school,
            String bio,
            List<String> interests) {
        UserEntity entity = new UserEntity();
        entity.setId(nextId(UserEntity::getId));
        entity.setUsername(username);
        entity.setPasswordHash(passwordHash);
        entity.setNickname(nickname);
        entity.setAvatarInitial(avatarInitial);
        entity.setSchool(school);
        entity.setBio(bio == null ? "" : bio);
        entity.setInterests(JsonListUtils.write(interests));
        entity.setCreatedAt(clock.instant().toString());
        save(entity);
        return entity.toDemoUser();
    }
}