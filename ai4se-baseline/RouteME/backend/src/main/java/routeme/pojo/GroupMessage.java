package routeme.pojo;

import java.time.Instant;

/**
 * 行程群聊消息；满员成行后发布者与已接受同行者共同可见。
 */
public record GroupMessage(
        long id,
        long tripId,
        long senderId,
        String content,
        Instant sentAt) {
}