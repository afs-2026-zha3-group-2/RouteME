package routeme.repository.impl;

import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

import routeme.entity.GreetingEntity;
import routeme.mapper.GreetingMapper;
import routeme.model.Greeting;
import routeme.repository.GreetingRepository;

/**
 * greetings 的持久化适配：MyBatis-Plus ServiceImpl 提供通用 CRUD。
 */
@Repository
public class GreetingRepositoryImpl extends ServiceImpl<GreetingMapper, GreetingEntity>
        implements GreetingRepository {

    @Override
    public Optional<Greeting> findGreeting() {
        return Optional.ofNullable(getBaseMapper().selectFirst()).map(GreetingEntity::toGreeting);
    }
}