package routeme.mapper;

import org.apache.ibatis.annotations.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import routeme.entity.UserEntity;

/**
 * app_users 的 MyBatis-Plus 映射。查询由 {@code BaseMapper} 与 {@code LambdaQueryWrapper} 承担。
 */
@Mapper
public interface UserMapper extends BaseMapper<UserEntity> {
}