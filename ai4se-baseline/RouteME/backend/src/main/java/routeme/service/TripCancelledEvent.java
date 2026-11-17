package routeme.service;

import java.time.Instant;

/**
 * 行程进入已取消的领域事件。
 *
 * <p>同行申请能力监听后在同一事务内取消该行程所有待处理申请；
 * 已接受同行关系保留。</p>
 *
 * @param tripId      行程 id
 * @param cancelledAt 取消时间
 */
public record TripCancelledEvent(long tripId, Instant cancelledAt) {
}
