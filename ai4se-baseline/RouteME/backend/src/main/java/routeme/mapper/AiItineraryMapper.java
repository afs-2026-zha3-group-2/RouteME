package routeme.mapper;

import org.apache.ibatis.annotations.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import routeme.entity.AiItineraryEntity;

/**
 * ai_itineraries 的 MyBatis-Plus 映射：只有整存整取，无自定义 SQL。
 */
@Mapper
public interface AiItineraryMapper extends BaseMapper<AiItineraryEntity> {
}