package routeme.service.impl;

import java.time.Clock;
import java.util.List;

import org.springframework.stereotype.Service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import routeme.entity.TripPlanEntity;
import routeme.entity.TripRouteCompletionEntity;
import routeme.mapper.TripPlanMapper;
import routeme.mapper.TripRouteCompletionMapper;
import routeme.pojo.RouteCompletion;
import routeme.pojo.TripRouteCompletion;
import routeme.service.RouteCompletionPolicy;
import routeme.service.TripRouteCompletionService;
import routeme.utils.JsonListUtils;

/**
 * 完成度声明的落库与个人聚合。有声明时按声明真实聚合；无声明但有历史已结束行程时，
 * 按已结束行程数派生一个兜底分（70 起步、每条 +5、上限 95），使老账号不再恒为数据不足；
 * 两者皆无才回落 {@link RouteCompletion#INSUFFICIENT}（前端展示为「-」）。
 *
 * <p>历史兜底只查 {@link TripPlanMapper} 而不依赖 TripPlanService，
 * 保持与服务层解耦、避免循环依赖。</p>
 */
@Service
public class TripRouteCompletionServiceImpl
        extends AbstractServiceImpl<TripRouteCompletionMapper, TripRouteCompletionEntity>
        implements TripRouteCompletionService {

    /** 历史兜底基数：1 条已结束行程时的完成率。 */
    static final int LEGACY_BASE_RATE = 70;
    /** 每多一条已结束行程的兜底递增。 */
    static final int LEGACY_STEP = 5;
    /** 兜底完成率上限，避免随行程数无限增长。 */
    static final int LEGACY_MAX_RATE = 95;

    private final Clock clock;
    private final TripPlanMapper tripPlanMapper;

    public TripRouteCompletionServiceImpl(Clock clock, TripPlanMapper tripPlanMapper) {
        this.clock = clock;
        this.tripPlanMapper = tripPlanMapper;
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
        if (!rows.isEmpty()) {
            return evaluateDeclarations(rows);
        }
        return evaluateLegacyTrips(userId);
    }

    /** 真实口径：按途经点加权（Σ完成点数 / Σ计划点数），样本数 = 声明条数。 */
    private RouteCompletion evaluateDeclarations(List<TripRouteCompletionEntity> rows) {
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

    /** 兜底口径：功能上线前的历史已结束行程没有声明，按行程数派生演示分。 */
    private RouteCompletion evaluateLegacyTrips(long userId) {
        Long completed = tripPlanMapper.selectCount(Wrappers.<TripPlanEntity>lambdaQuery()
                .eq(TripPlanEntity::getPublisherId, userId)
                .isNotNull(TripPlanEntity::getCompletedAt));
        int samples = completed == null ? 0 : completed.intValue();
        if (samples < 1) {
            return RouteCompletion.INSUFFICIENT;
        }
        int rate = Math.min(LEGACY_MAX_RATE, LEGACY_BASE_RATE + LEGACY_STEP * samples);
        return RouteCompletionPolicy.evaluate(rate, samples);
    }
}