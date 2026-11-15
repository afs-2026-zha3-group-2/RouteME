package routeme.service.impl;

import java.util.List;

import org.springframework.stereotype.Service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import routeme.exception.DemoUserRequiredException;
import routeme.mapper.UserMapper;
import routeme.pojo.DemoUser;
import routeme.entity.UserEntity;
import routeme.service.DemoUserService;

/**
 * 演示账户的持久化实现：账户列表与 {@code X-User-Id} 解析。
 * 方法契约以 {@link routeme.service.DemoUserService} 为准。
 */
@Service
public class DemoUserServiceImpl extends AbstractServiceImpl<UserMapper, UserEntity>
        implements DemoUserService {

    @Override
    public List<DemoUser> findAll() {
        return list(Wrappers.<UserEntity>lambdaQuery().orderByAsc(UserEntity::getId)).stream()
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
}