package routeme.response;

/**
 * 「我的旅行」聚合中的按行程待处理申请数：只读投影，不拥有数据表。
 */
public record PendingApplicationCount(long tripId, int count) {
}