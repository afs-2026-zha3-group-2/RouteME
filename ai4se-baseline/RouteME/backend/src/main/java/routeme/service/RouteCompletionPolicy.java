package routeme.service;

import routeme.enums.RouteCompletionState;
import routeme.pojo.RouteCompletion;

/**
 * 路线完成度派生单点：阈值只在这里实现，前端只做状态码 → 文案映射。
 *
 * <p>数据源由 {@link TripRouteCompletionService#evaluate} 提供：优先为结束行程时落库的
 * 完成度声明（trip_route_completions）；无声明时回落到历史已结束行程数的演示分。
 * 两者皆无时传 {@code null} + 0，得 {@link RouteCompletionState#INSUFFICIENT}（前端展示为「-」）。
 *
 * <p>失败安全：非法数值（负数、大于 100、空值）一律降级为数据不足，
 * 不得落入 {@link RouteCompletionState#GOOD}。
 */
public final class RouteCompletionPolicy {

    /** 信誉良好下界（含）。 */
    public static final int GOOD_MIN = 80;

    /** 中性区间下界（含）。 */
    public static final int NEUTRAL_MIN = 70;

    private RouteCompletionPolicy() {
    }

    /**
     * 按完成度数值与已结束行程样本数派生状态。
     *
     * @param rate               完成度数值，0–100；无有效数值时传 {@code null}
     * @param completedTripCount 带完成度声明的已结束行程样本数，无声明时为 0
     * @return 派生结果；数据不足时 {@code rate} 为 {@code null}，状态为 {@code insufficient}
     */
    public static RouteCompletion evaluate(Integer rate, int completedTripCount) {
        if (completedTripCount < 1 || rate == null || rate < 0 || rate > 100) {
            return RouteCompletion.INSUFFICIENT;
        }
        RouteCompletionState state;
        if (rate >= GOOD_MIN) {
            state = RouteCompletionState.GOOD;
        } else if (rate >= NEUTRAL_MIN) {
            state = RouteCompletionState.NEUTRAL;
        } else {
            state = RouteCompletionState.WATCH;
        }
        return new RouteCompletion(rate, state);
    }
}
