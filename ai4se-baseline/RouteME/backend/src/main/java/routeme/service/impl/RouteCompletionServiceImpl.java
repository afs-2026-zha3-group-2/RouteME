package routeme.service.impl;

import java.time.Clock;
import java.time.Instant;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import routeme.enums.TripStatusEnum;
import routeme.pojo.RouteCompletion;
import routeme.pojo.TripApplication;
import routeme.service.ApplicationService;
import routeme.service.RouteCompletionPolicy;
import routeme.service.RouteCompletionService;
import routeme.service.TripPlanService;

/**
 * 路线完成度聚合（演示口径）：仓库尚无人工打卡数据源，样本数取「发布者身份 + 已接受同行者身份」
 * 的已结束行程；完成率按样本数派生一个稳定的演示值，使个人主页能展示真实状态而非恒为数据不足。
 * 打卡数据上线后替换 {@link #demoRate(int)} 即可，阈值派生仍由 {@link RouteCompletionPolicy} 单点负责。
 */
@Service
public class RouteCompletionServiceImpl implements RouteCompletionService {

    /** 演示完成率基数：1 条已结束行程时的取值。 */
    static final int DEMO_BASE = 70;
    /** 每多一条已结束行程的演示递增。 */
    static final int DEMO_STEP = 5;
    /** 演示完成率上限，避免随样本无限增长。 */
    static final int DEMO_MAX = 95;

    private final TripPlanService tripPlanService;
    private final ApplicationService applicationService;
    private final Clock clock;

    public RouteCompletionServiceImpl(
            TripPlanService tripPlanService,
            ApplicationService applicationService,
            Clock clock) {
        this.tripPlanService = tripPlanService;
        this.applicationService = applicationService;
        this.clock = clock;
    }

    @Override
    public RouteCompletion evaluate(long userId) {
        Instant now = clock.instant();
        Set<Long> acceptedTripIds = applicationService.mine(userId).stream()
                .filter(TripApplication::isAccepted)
                .map(TripApplication::tripId)
                .collect(Collectors.toSet());
        int completedTrips = (int) tripPlanService.findAllTrips().stream()
                .filter(trip -> trip.status(now) == TripStatusEnum.COMPLETED)
                .filter(trip -> trip.publisherId() == userId || acceptedTripIds.contains(trip.id()))
                .count();
        return RouteCompletionPolicy.evaluate(demoRate(completedTrips), completedTrips);
    }

    /**
     * 演示完成率：真实打卡数据接入前的临时口径，按已结束行程数单调递增。
     */
    private static Integer demoRate(int completedTrips) {
        return completedTrips < 1 ? null : Math.min(DEMO_MAX, DEMO_BASE + DEMO_STEP * completedTrips);
    }
}
