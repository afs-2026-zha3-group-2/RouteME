package routeme.service;

import java.time.Instant;

/**
 * 信用分变化事件：由 {@code CreditService.book} 在账户更新后同步发布，
 * 监听器在同一事务内处理限制触发 / 解除。
 */
public record CreditChangedEvent(
        long userId,
        int scoreBefore,
        int scoreAfter,
        Long ledgerId,
        String reasonCode,
        Instant occurredAt) {
}
