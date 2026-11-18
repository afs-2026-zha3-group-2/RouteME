package routeme.response;

/**
 * SSE 推送载荷：通知本身，消息类事件附上刚保存的消息正文。
 */
public record NotificationEventResponse(
        NotificationResponse notification, ChatMessageResponse message) {
}