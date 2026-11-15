package routeme.repository.impl;

import java.util.Optional;

import org.springframework.stereotype.Repository;

import routeme.entity.GreetingEntity;
import routeme.mapper.GreetingMapper;
import routeme.model.Greeting;
import routeme.repository.GreetingRepository;

/**
 * greetings 的持久化适配：MyBatis-Plus ServiceImpl 提供通用 CRUD。
 */
@Repository
public class GreetingRepositoryImpl extends AbstractRepositoryImpl<GreetingMapper, GreetingEntity>
        implements GreetingRepository {

    @Override
    public Optional<Greeting> findGreeting() {
        return firstBy(GreetingEntity::getId, true).map(GreetingEntity::toGreeting);
    }
}