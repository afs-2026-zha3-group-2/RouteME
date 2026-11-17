package routeme.request;

/**
 * 客服消息请求。发送者身份由服务端根据 Bearer 会话判定，客户端携带的
 * {@code senderRole} / {@code sender_id} 一律忽略。
 */
public record ServiceMessageRequest(String content) {
}