package routeme.mapper;

import org.apache.ibatis.annotations.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import routeme.entity.AuthSessionEntity;

/**
 * auth_sessions 的 MyBatis-Plus 映射。
 */
@Mapper
public interface AuthSessionMapper extends BaseMapper<AuthSessionEntity> {
}