package routeme.pojo;

import routeme.enums.RouteCompletionState;

/**
 * 路线完成度的派生结果：{@code rate} 为 0–100 的整数，数据不足时为 {@code null}；
 * {@code state} 恒非空。本对象不落库，只随资料响应下发。
 */
public record RouteCompletion(Integer rate, RouteCompletionState state) {

    public static final RouteCompletion INSUFFICIENT = new RouteCompletion(null, RouteCompletionState.INSUFFICIENT);
}
