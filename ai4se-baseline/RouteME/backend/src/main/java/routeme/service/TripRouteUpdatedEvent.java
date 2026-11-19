package routeme.service;

import java.time.Instant;
import java.util.List;

/**
 * 发布者更新途经点的领域事件。
 *
 * <p>通知能力监听后告知已接受同行者；群聊能力监听后在群内同步一条路线变更消息。</p>
 *
 * @param tripId      行程 id
 * @param publisherId 发布者 id
 * @param stops       更新后的完整途经点列表
 * @param updatedAt   本次更新时间（通知去重键的一部分）
 */
public record TripRouteUpdatedEvent(long tripId, long publisherId, List<String> stops, Instant updatedAt) {
}