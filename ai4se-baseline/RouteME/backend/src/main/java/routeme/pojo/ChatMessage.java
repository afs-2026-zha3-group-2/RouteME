package routeme.pojo;

import java.time.Instant;

/**
 * 一对一聊天消息；仅发布者与已接受同行者之间可见。
 */
public record ChatMessage(
        long id,
        long tripId,
        long senderId,
        long receiverId,
        String content,
        Instant sentAt) {

    public ChatMessage withId(long newId) {
        return new ChatMessage(newId, tripId, senderId, receiverId, content, sentAt);
    }
}