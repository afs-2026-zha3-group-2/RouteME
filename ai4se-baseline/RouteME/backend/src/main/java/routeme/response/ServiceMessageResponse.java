package routeme.response;

/** 客服消息（schema {@code ServiceMessage}）。 */
public record ServiceMessageResponse(
        long id,
        long sessionId,
        String senderType,
        long senderId,
        String senderNickname,
        String content,
        String createdAt) {
}