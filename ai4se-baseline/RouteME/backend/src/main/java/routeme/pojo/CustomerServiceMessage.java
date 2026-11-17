package routeme.pojo;

import java.time.Instant;

/** 客服会话消息，{@code senderType} 为 {@code USER} 或 {@code ADMIN}。 */
public record CustomerServiceMessage(
        long id,
        long sessionId,
        String senderType,
        long senderId,
        String content,
        Instant createdAt) {
}