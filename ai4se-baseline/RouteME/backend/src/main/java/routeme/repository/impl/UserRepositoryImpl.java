package routeme.repository.impl;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

import routeme.entity.UserEntity;
import routeme.mapper.UserMapper;
import routeme.model.DemoUser;
import routeme.repository.UserRepository;

/**
 * app_users 的持久化适配。
 */
@Repository
public class UserRepositoryImpl extends ServiceImpl<UserMapper, UserEntity> implements UserRepository {

    @Override
    public List<DemoUser> findAll() {
        return list(Wrappers.<UserEntity>lambdaQuery().orderByAsc(UserEntity::getId)).stream()
                .map(UserEntity::toDemoUser)
                .toList();
    }

    @Override
    public Optional<DemoUser> findById(long id) {
        return Optional.ofNullable(getById(id)).map(UserEntity::toDemoUser);
    }
}