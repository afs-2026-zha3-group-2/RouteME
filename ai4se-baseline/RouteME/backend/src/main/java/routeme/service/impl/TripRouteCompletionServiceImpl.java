package routeme.service.impl;

import java.time.Clock;
import java.util.List;

import org.springframework.stereotype.Service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import routeme.entity.TripRouteCompletionEntity;
import routeme.mapper.TripRouteCompletionMapper;
import routeme.pojo.RouteCompletion;
import routeme.pojo.TripRouteCompletion;
import routeme.service.RouteCompletionPolicy;
import routeme.service.TripRouteCompletionService;
import routeme.utils.JsonListUtils;

/**
 * 完成度声明的落库与个人聚合。只依赖自身表与 {@link Clock}，不回查行程状态：
 * completed 行程不可再取消，声明天然只属于已结束未取消行程（见接口契约）。
 */
@Service
public class TripRouteCompletionServiceImpl
        extends AbstractServiceImpl<TripRouteCompletionMapper, TripRouteCompletionEntity>
        implements TripRouteCompletionService {

    private final Clock clock;

    public TripRouteCompletionServiceImpl(Clock clock) {
        this.clock = clock;
    }

    @Override
    public void record(long tripId, long userId, List<Integer> completedStopIndexes, int plannedStopCount) {
        TripRouteCompletion completion = new TripRouteCompletion(
                nextId(TripRouteCompletionEntity::getId),
                tripId,
                userId,
                completedStopIndexes,
                plannedStopCount,
                clock.instant());
        save(TripRouteCompletionEntity.from(completion));
    }

    @Override
    public RouteCompletion evaluate(long userId) {
        List<TripRouteCompletionEntity> rows = list(Wrappers.<TripRouteCompletionEntity>lambdaQuery()
                .eq(TripRouteCompletionEntity::getUserId, userId));
        if (rows.isEmpty()) {
            return RouteCompletion.INSUFFICIENT;
        }
        long totalPlanned = 0;
        long totalDone = 0;
        for (TripRouteCompletionEntity row : rows) {
            totalPlanned += row.getPlannedStopCount();
            totalDone += JsonListUtils.parseInts(row.getCompletedStopIndexes()).size();
        }
        if (totalPlanned < 1) {
            return RouteCompletion.INSUFFICIENT;
        }
        int rate = (int) Math.round(100.0 * totalDone / totalPlanned);
        return RouteCompletionPolicy.evaluate(rate, rows.size());
    }
}