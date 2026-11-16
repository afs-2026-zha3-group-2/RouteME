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
            @Param("sort") String sort,
            @Param("today") String today);

    List<TripPlanEntity> selectOpenList(
            @Param("destinationCode") String destinationCode,
            @Param("dateFrom") String dateFrom,
            @Param("dateTo") String dateTo,
            @Param("tags") List<String> tags,
            @Param("sort") String sort,
            @Param("today") String today);

    /** 到期但尚未物化的行程 id（结束日期早于今天）。 */
    List<Long> selectExpiredIds(@Param("today") String today);

    /** 条件写入完成时间；只有 completed_at 为空时才更新，返回受影响行数。 */
    int completeIfAbsent(
            @Param("id") long id,
            @Param("completedAt") String completedAt,
            @Param("updatedAt") String updatedAt);
}