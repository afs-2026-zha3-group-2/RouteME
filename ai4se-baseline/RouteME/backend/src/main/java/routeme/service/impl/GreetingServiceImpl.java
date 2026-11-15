package routeme.service.impl;

import java.util.Optional;

import org.springframework.stereotype.Service;

import routeme.exception.GreetingNotFoundException;
import routeme.mapper.GreetingMapper;
import routeme.pojo.Greeting;
import routeme.entity.GreetingEntity;
import routeme.service.GreetingService;

/**
 * 问候语的持久化实现：取表内首条记录。
 * 方法契约以 {@link routeme.service.GreetingService} 为准。
 */
@Service
public class GreetingServiceImpl extends AbstractServiceImpl<GreetingMapper, GreetingEntity>
        implements GreetingService {

    @Override
    public Greeting loadGreeting() {
        Optional<GreetingEntity> entity = firstBy(GreetingEntity::getId, true);
        return entity.map(GreetingEntity::toGreeting).orElseThrow(GreetingNotFoundException::new);
    }
}