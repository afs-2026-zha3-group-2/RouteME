package routeme.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;

import routeme.entity.TripExperienceEntity;

/**
 * trip_experiences 的 MyBatis-Plus 映射。分页查询在 resources/mapper/TripExperienceMapper.xml。
 */
public interface TripExperienceMapper extends BaseMapper<TripExperienceEntity> {

    IPage<TripExperienceEntity> selectExperiencePage(
            IPage<TripExperienceEntity> page,
            @Param("q") String keyword,
            @Param("destination") String destination,
            @Param("tags") List<String> tags);

    @Select("SELECT COALESCE(MAX(id), 0) + 1 FROM trip_experiences")
    long selectNextId();
}