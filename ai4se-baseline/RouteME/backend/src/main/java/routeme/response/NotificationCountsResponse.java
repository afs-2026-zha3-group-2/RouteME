package routeme.response;

/**
 * 未读计数：总数与按类型拆分。
 */
public record NotificationCountsResponse(long total, long application, long message) {
}