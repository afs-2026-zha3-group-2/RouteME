package routeme.mapper;

import org.apache.ibatis.annotations.Select;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import routeme.entity.TripApplicationEntity;

/**
 * trip_applications 的 MyBatis-Plus 映射。
 */
public interface TripApplicationMapper extends BaseMapper<TripApplicationEntity> {

    @Select("SELECT COALESCE(MAX(id), 0) + 1 FROM trip_applications")
    long selectNextId();
}