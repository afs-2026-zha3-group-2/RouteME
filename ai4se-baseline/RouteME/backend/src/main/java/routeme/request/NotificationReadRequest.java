package routeme.request;

/**
 * 标读请求。
 *
 * @param scope       {@code all}、{@code conversation} 或 {@code group_conversation}
 * @param tripId      {@code scope=conversation} / {@code group_conversation} 使用
 * @param otherUserId 仅 {@code scope=conversation} 使用
 */
public record NotificationReadRequest(String scope, Long tripId, Long otherUserId) {
}