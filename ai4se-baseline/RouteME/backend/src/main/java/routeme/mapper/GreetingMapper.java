package routeme.mapper;

import org.apache.ibatis.annotations.Select;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import routeme.entity.GreetingEntity;

/**
 * greetings 的 MyBatis-Plus 映射。
 */
public interface GreetingMapper extends BaseMapper<GreetingEntity> {

    @Select("SELECT id, message FROM greetings ORDER BY id LIMIT 1")
    GreetingEntity selectFirst();
}