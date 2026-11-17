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
                .map(entity -> entity.toDemoUser(clock))
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
        return entity.toDemoUser(clock);
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
    public boolean emailExists(String email) {
        if (email == null || email.isBlank()) {
            return false;
        }
        return count(Wrappers.<UserEntity>lambdaQuery().eq(UserEntity::getEmail, email)) > 0;
    }

    @Override
    @Transactional
    public DemoUser createAccount(
            String username,
            String passwordHash,
            String nickname,
            String avatarInitial,
            String email) {
        UserEntity entity = new UserEntity();
        entity.setId(nextId(UserEntity::getId));
        entity.setUsername(username);
        entity.setPasswordHash(passwordHash);
        entity.setNickname(nickname);
        entity.setAvatarInitial(avatarInitial);
        entity.setSchool("");
        entity.setBio("");
        entity.setInterests(JsonListUtils.write(List.of()));
        entity.setCreatedAt(clock.instant().toString());
        entity.setEmail(email);
        entity.setRole("USER");
        entity.setStatus("ACTIVE");
        save(entity);
        return entity.toDemoUser(clock);
    }
}