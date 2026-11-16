package routeme.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;

import routeme.entity.TripPlanEntity;

/**
 * trip_plans 的 MyBatis-Plus 映射。
 *
 * <p>复杂查询（join 发布者、标签与日期区间过滤、排序）写在 {@code resources/mapper/TripPlanMapper.xml}；
 * 简单条件与单表增删改查由 {@code BaseMapper} 与 {@code LambdaQueryWrapper} 承担。</p>
 */
@Mapper
public interface TripPlanMapper extends BaseMapper<TripPlanEntity> {

    IPage<TripPlanEntity> selectOpenPage(
            IPage<TripPlanEntity> page,
            @Param("destinationCode") String destinationCode,
            @Param("dateFrom") String dateFrom,
            @Param("dateTo") String dateTo,
            @Param("tags") List<String> tags,
            @Param("sort") String sort);

    List<TripPlanEntity> selectOpenList(
            @Param("destinationCode") String destinationCode,
            @Param("dateFrom") String dateFrom,
            @Param("dateTo") String dateTo,
            @Param("tags") List<String> tags,
            @Param("sort") String sort);
}