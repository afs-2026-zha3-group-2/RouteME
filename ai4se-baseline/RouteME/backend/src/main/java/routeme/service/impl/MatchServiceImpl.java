package routeme.service.impl;

import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;

import routeme.exception.TripNotFoundException;
import routeme.param.PageParam;
import routeme.pojo.DemoUser;
import routeme.pojo.MatchCandidate;
import routeme.pojo.PageResult;
import routeme.pojo.TripMatch;
import routeme.pojo.TripPlan;
import routeme.request.TripQuery;
import routeme.service.DemoUserService;
import routeme.service.MatchService;
import routeme.service.TripPlanService;

/**
 * 同行匹配的实现：调用 {@link routeme.pojo.TripMatch} 计算分值，按需排序与切片。
 * 方法契约以 {@link routeme.service.MatchService} 为准。
 */
@Service
public class MatchServiceImpl implements MatchService {

    private final TripPlanService tripPlanService;
    private final DemoUserService demoUserService;

    public MatchServiceImpl(TripPlanService tripPlanService, DemoUserService demoUserService) {
        this.tripPlanService = tripPlanService;
        this.demoUserService = demoUserService;
    }

    @Override
    public List<MatchCandidate> search(TripQuery query, long userId) {
        DemoUser me = demoUserService.require(userId);
        TripPlan reference = tripPlanService.latestOpenByPublisher(userId).orElse(null);
        List<MatchCandidate> candidates = tripPlanService.findOpen(query).stream()
                .map(trip -> new MatchCandidate(
                        trip,
                        tripPlanService.publisherOf(trip),
                        TripMatch.of(trip, reference, query.destination(), query.dateFrom(), me.interests())))
                .toList();
        if (query.sort() == TripQuery.SortOrder.MATCH) {
            return candidates.stream()
                    .sorted(Comparator.comparingInt((MatchCandidate candidate) -> candidate.match().score())
                            .reversed()
                            .thenComparing(candidate -> candidate.trip().createdAt(), Comparator.reverseOrder()))
                    .toList();
        }
        return candidates;
    }

    /**
     * 匹配分在 Java 中计算（SQL 无法排序），因此先算出完整候选再切页；total 反映筛选后的命中数。
     */
    @Override
    public PageResult<MatchCandidate> searchPage(TripQuery query, long userId, PageParam param) {
        List<MatchCandidate> all = search(query, userId);
        return new PageResult<>(param.slice(all), param.page(), param.size(), all.size());
    }

    @Override
    public MatchCandidate matchFor(long tripId, long userId) {
        DemoUser me = demoUserService.require(userId);
        TripPlan trip = tripPlanService.require(tripId);
        if (trip == null) {
            throw new TripNotFoundException(tripId);
        }
        TripPlan reference = tripPlanService.latestOpenByPublisher(userId).orElse(null);
        TripQuery empty = TripQuery.empty();
        return new MatchCandidate(
                trip,
                tripPlanService.publisherOf(trip),
                TripMatch.of(trip, reference, empty.destination(), empty.dateFrom(), me.interests()));
    }
}