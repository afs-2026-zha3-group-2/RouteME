package routeme.service;

import java.time.Instant;

/**
 * 行程满员成行的领域事件。
 *
 * <p>接受申请使人数达到上限时发布；群聊能力监听后在同一事务内
 * 开设行程群（落欢迎消息并通知参与者），幂等。</p>
 *
 * @param tripId      行程 id
 * @param publisherId 发布者 id
 * @param fullAt      满员时刻
 */
public record TripFullEvent(long tripId, long publisherId, Instant fullAt) {
}