package routeme.service;

import java.time.Instant;

/**
 * 行程进入已结束的领域事件。
 *
 * <p>手动结束与到期自动完成都发布本事件；同行申请能力监听后在同一事务内
 * 取消该行程所有待处理申请。</p>
 *
 * @param tripId      行程 id
 * @param completedAt 完成时间（手动结束时间或计划结束时刻）
 */
public record TripCompletedEvent(long tripId, Instant completedAt) {
}
