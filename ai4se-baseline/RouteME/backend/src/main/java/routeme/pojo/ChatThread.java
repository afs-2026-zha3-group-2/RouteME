package routeme.pojo;

/**
 * 一位聊天对象在某条行程下的会话摘要。
 */
public record ChatThread(long tripId, long otherUserId, ChatMessage lastMessage, int messageCount) {
}