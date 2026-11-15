package routeme.mapper;

import org.apache.ibatis.annotations.Select;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import routeme.entity.ReportEntity;

/**
 * reports 的 MyBatis-Plus 映射。
 */
public interface ReportMapper extends BaseMapper<ReportEntity> {

    @Select("SELECT COALESCE(MAX(id), 0) + 1 FROM reports")
    long selectNextId();
}