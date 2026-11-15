package routeme.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;

import routeme.entity.TripPlanEntity;

/**
 * trip_plans 的 MyBatis-Plus 映射。分页查询在 resources/mapper/TripPlanMapper.xml。
 */
public interface TripPlanMapper extends BaseMapper<TripPlanEntity> {

    IPage<TripPlanEntity> selectOpenPage(
            IPage<TripPlanEntity> page,
            @Param("q") String keyword,
            @Param("destination") String destination,
            @Param("dateFrom") String dateFrom,
            @Param("dateTo") String dateTo,
            @Param("tags") List<String> tags,
            @Param("sort") String sort);

    @Select("SELECT COALESCE(MAX(id), 0) + 1 FROM trip_plans")
    long selectNextId();
}