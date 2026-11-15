package routeme.repository;

import java.util.List;

import routeme.model.ChatMessage;
import routeme.model.ChatThread;

public interface ChatMessageRepository {

    List<ChatMessage> findConversation(long tripId, long firstUserId, long secondUserId);

    List<ChatThread> findThreads(long userId);

    long nextId();

    void insert(ChatMessage message);
}