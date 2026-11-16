package routeme.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;

import routeme.entity.TripExperienceEntity;

/**
 * trip_experiences 的 MyBatis-Plus 映射。
 *
 * <p>复杂查询（join 行程表做目的地、日期与标签过滤）写在
 * {@code resources/mapper/TripExperienceMapper.xml}。</p>
 */
@Mapper
public interface TripExperienceMapper extends BaseMapper<TripExperienceEntity> {

    IPage<TripExperienceEntity> selectExperiencePage(
            IPage<TripExperienceEntity> page,
            @Param("destinationCode") String destinationCode,
            @Param("dateFrom") String dateFrom,
            @Param("dateTo") String dateTo,
            @Param("tags") List<String> tags);
}