package routeme.service;

import java.time.Instant;

/**
 * 行程已取消事件：{@code cancelReason} 为取消原因 wire 值；
 * 系统信用清退使用 {@code credit_restricted}，申请监听器据此写状态原因。
 */
public record TripCancelledEvent(long tripId, Instant cancelledAt, String cancelReason) {

    public TripCancelledEvent(long tripId, Instant cancelledAt) {
        this(tripId, cancelledAt, null);
    }
}
