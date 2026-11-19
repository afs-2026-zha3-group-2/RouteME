package routeme.mapper;

import org.apache.ibatis.annotations.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import routeme.entity.TripRouteCompletionEntity;

/**
 * trip_route_completions 的 MyBatis-Plus 映射。
 */
@Mapper
public interface TripRouteCompletionMapper extends BaseMapper<TripRouteCompletionEntity> {
}