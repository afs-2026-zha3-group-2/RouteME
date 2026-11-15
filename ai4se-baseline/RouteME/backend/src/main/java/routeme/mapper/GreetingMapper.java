package routeme.mapper;

import org.apache.ibatis.annotations.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import routeme.entity.GreetingEntity;

/**
 * greetings 的 MyBatis-Plus 映射。查询由 {@code LambdaQueryWrapper} 构造，无自定义 SQL。
 */
@Mapper
public interface GreetingMapper extends BaseMapper<GreetingEntity> {
}