package routeme.repository.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

import routeme.entity.ChatMessageEntity;
import routeme.entity.ChatThreadEntity;
import routeme.mapper.ChatMessageMapper;
import routeme.model.ChatMessage;
import routeme.model.ChatThread;
import routeme.repository.ChatMessageRepository;

/**
 * chat_messages 的持久化适配。
 */
@Repository
public class ChatMessageRepositoryImpl extends ServiceImpl<ChatMessageMapper, ChatMessageEntity>
        implements ChatMessageRepository {

    @Override
    public List<ChatMessage> findConversation(long tripId, long firstUserId, long secondUserId) {
        return list(Wrappers.<ChatMessageEntity>lambdaQuery()
                .eq(ChatMessageEntity::getTripId, tripId)
                .and(wrapper -> wrapper
                        .nested(inner -> inner
                                .eq(ChatMessageEntity::getSenderId, firstUserId)
                                .eq(ChatMessageEntity::getReceiverId, secondUserId))
                        .or()
                        .nested(inner -> inner
                                .eq(ChatMessageEntity::getSenderId, secondUserId)
                                .eq(ChatMessageEntity::getReceiverId, firstUserId)))
                .orderByAsc(ChatMessageEntity::getSentAt)
                .orderByAsc(ChatMessageEntity::getId)).stream()
                .map(ChatMessageEntity::toChatMessage)
                .toList();
    }

    @Override
    public List<ChatThread> findThreads(long userId) {
        List<ChatThreadEntity> rows = getBaseMapper().selectThreads(userId);
        return rows.stream()
                .map(row -> new ChatThread(
                        row.getTripId(),
                        row.getOtherId(),
                        lastMessage(row.getTripId(), userId, row.getOtherId()),
                        row.getMessageCount()))
                .toList();
    }

    @Override
    public long nextId() {
        return getBaseMapper().selectNextId();
    }

    @Override
    public void insert(ChatMessage message) {
        save(ChatMessageEntity.from(message));
    }

    private ChatMessage lastMessage(long tripId, long firstUserId, long secondUserId) {
        List<ChatMessage> conversation = findConversation(tripId, firstUserId, secondUserId);
        return conversation.isEmpty() ? null : conversation.getLast();
    }
}