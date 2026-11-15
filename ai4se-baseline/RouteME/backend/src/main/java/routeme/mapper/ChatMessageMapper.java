package routeme.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import routeme.entity.ChatMessageEntity;
import routeme.entity.ChatThreadEntity;

/**
 * chat_messages 的 MyBatis-Plus 映射。
 *
 * <p>会话聚合（按行程与对方分组求和）写在 {@code resources/mapper/ChatMessageMapper.xml}。</p>
 */
@Mapper
public interface ChatMessageMapper extends BaseMapper<ChatMessageEntity> {

    List<ChatThreadEntity> selectThreads(@Param("userId") long userId);
}