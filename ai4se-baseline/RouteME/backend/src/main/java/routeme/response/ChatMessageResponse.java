package routeme.response;

import java.time.Instant;

import routeme.pojo.ChatMessage;

public record ChatMessageResponse(
        long id,
        long tripId,
        long senderId,
        long receiverId,
        String content,
        Instant sentAt) {

    public static ChatMessageResponse from(ChatMessage message) {
        return new ChatMessageResponse(
                message.id(),
                message.tripId(),
                message.senderId(),
                message.receiverId(),
                message.content(),
                message.sentAt());
    }
}