package routeme.service;

import java.util.List;

import routeme.pojo.RouteCompletion;

/**
 * 路线完成度声明的写入与个人聚合。声明只在发布者显式结束行程时落库，结束后不可修改。
 *
 * <p>聚合优先读本表声明；无声明时回查到该用户作为发布者的历史已结束行程数做演示兜底，
 * 因此不依赖 {@link TripPlanService}（只依赖其 mapper，避免循环依赖）。</p>
 */
public interface TripRouteCompletionService {

    /**
     * 落库一次完成度声明。{@code completedStopIndexes} 必须已经过
     * {@link routeme.pojo.TripRouteCompletion#cleanIndexes} 校验（升序、去重、范围内）。
     */
    void record(long tripId, long userId, List<Integer> completedStopIndexes, int plannedStopCount);

    /**
     * 个人完成度聚合：有声明时按途经点加权（Σ完成点数 / Σ计划点数），样本数 = 声明条数；
     * 无声明但有已结束行程时按行程数派生兜底分；两者皆无返回 {@link RouteCompletion#INSUFFICIENT}。
     * 阈值口径见 {@link RouteCompletionPolicy}。
     */
    RouteCompletion evaluate(long userId);
}