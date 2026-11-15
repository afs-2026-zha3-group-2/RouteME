package routeme.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import routeme.entity.ChatMessageEntity;
import routeme.entity.ChatThreadEntity;

/**
 * chat_messages 的 MyBatis-Plus 映射。
 */
public interface ChatMessageMapper extends BaseMapper<ChatMessageEntity> {

    @Select("""
            SELECT trip_id,
                   CASE WHEN sender_id = #{userId} THEN receiver_id ELSE sender_id END AS other_id,
                   COUNT(*) AS message_count
              FROM chat_messages
             WHERE sender_id = #{userId} OR receiver_id = #{userId}
             GROUP BY trip_id, other_id
            """)
    List<ChatThreadEntity> selectThreads(@Param("userId") long userId);

    @Select("SELECT COALESCE(MAX(id), 0) + 1 FROM chat_messages")
    long selectNextId();
}