package routeme.request;

/**
 * 标读请求。
 *
 * @param scope       {@code all} 或 {@code conversation}
 * @param tripId      仅 {@code scope=conversation} 使用
 * @param otherUserId 仅 {@code scope=conversation} 使用
 */
public record NotificationReadRequest(String scope, Long tripId, Long otherUserId) {
}