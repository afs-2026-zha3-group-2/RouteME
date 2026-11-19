package routeme.response;

/**
 * SSE 推送载荷：通知本身，消息类事件附上刚保存的消息正文（一对一或群聊）。
 */
public record NotificationEventResponse(
        NotificationResponse notification,
        ChatMessageResponse message,
        GroupMessageResponse groupMessage) {

    public NotificationEventResponse(NotificationResponse notification, ChatMessageResponse message) {
        this(notification, message, null);
    }
}