package routeme.dao;

import java.time.Instant;
import java.util.List;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import routeme.model.ChatMessage;
import routeme.model.ChatThread;
import routeme.repository.ChatMessageRepository;

@Repository
public class ChatMessageDao implements ChatMessageRepository {

    private static final String SELECT_MESSAGE =
            """
            SELECT id, trip_id, sender_id, receiver_id, content, sent_at
              FROM chat_messages
            """;

    private final JdbcClient jdbcClient;

    public ChatMessageDao(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    public List<ChatMessage> findConversation(long tripId, long firstUserId, long secondUserId) {
        return jdbcClient.sql(SELECT_MESSAGE
                        + """
                           WHERE trip_id = :tripId
                             AND ((sender_id = :firstUser AND receiver_id = :secondUser)
                               OR (sender_id = :secondUser AND receiver_id = :firstUser))
                           ORDER BY sent_at, id
                          """)
                .param("tripId", tripId)
                .param("firstUser", firstUserId)
                .param("secondUser", secondUserId)
                .query((resultSet, rowNumber) -> toMessage(resultSet))
                .list();
    }

    @Override
    public List<ChatThread> findThreads(long userId) {
        List<ThreadRow> rows = jdbcClient.sql("""
                        SELECT trip_id,
                               CASE WHEN sender_id = :userId THEN receiver_id ELSE sender_id END AS other_id,
                               COUNT(*) AS message_count,
                               MAX(sent_at) AS last_sent_at
                          FROM chat_messages
                         WHERE sender_id = :userId OR receiver_id = :userId
                         GROUP BY trip_id, other_id
                         ORDER BY last_sent_at DESC
                        """)
                .param("userId", userId)
                .query((resultSet, rowNumber) -> new ThreadRow(
                        resultSet.getLong("trip_id"),
                        resultSet.getLong("other_id"),
                        resultSet.getInt("message_count")))
                .list();
        return rows.stream()
                .map(row -> new ChatThread(
                        row.tripId(),
                        row.otherUserId(),
                        lastMessage(row.tripId(), userId, row.otherUserId()),
                        row.messageCount()))
                .toList();
    }

    @Override
    public long nextId() {
        return jdbcClient.sql("SELECT COALESCE(MAX(id), 0) + 1 FROM chat_messages")
                .query(Long.class)
                .single();
    }

    @Override
    public void insert(ChatMessage message) {
        jdbcClient.sql("""
                        INSERT INTO chat_messages (id, trip_id, sender_id, receiver_id, content, sent_at)
                        VALUES (:id, :tripId, :senderId, :receiverId, :content, :sentAt)
                        """)
                .param("id", message.id())
                .param("tripId", message.tripId())
                .param("senderId", message.senderId())
                .param("receiverId", message.receiverId())
                .param("content", message.content())
                .param("sentAt", message.sentAt().toString())
                .update();
    }

    private ChatMessage lastMessage(long tripId, long firstUserId, long secondUserId) {
        List<ChatMessage> conversation = findConversation(tripId, firstUserId, secondUserId);
        return conversation.isEmpty() ? null : conversation.getLast();
    }

    private ChatMessage toMessage(java.sql.ResultSet resultSet) throws java.sql.SQLException {
        return new ChatMessage(
                resultSet.getLong("id"),
                resultSet.getLong("trip_id"),
                resultSet.getLong("sender_id"),
                resultSet.getLong("receiver_id"),
                resultSet.getString("content"),
                Instant.parse(resultSet.getString("sent_at")));
    }

    private record ThreadRow(long tripId, long otherUserId, int messageCount) {
    }
}