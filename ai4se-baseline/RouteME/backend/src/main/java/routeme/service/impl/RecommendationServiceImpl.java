package routeme.service.impl;

import java.util.List;

import org.springframework.stereotype.Service;

import routeme.pojo.DemoUser;
import routeme.pojo.RecommendationReference;
import routeme.pojo.RecommendationResult;
import routeme.pojo.TravelerMatch;
import routeme.pojo.TravelerRecommendation;
import routeme.pojo.TravelerRecommendationRanker;
import routeme.pojo.TripPlan;
import routeme.request.TripQuery;
import routeme.service.DemoUserService;
import routeme.service.RecommendationService;
import routeme.service.TripPlanService;

/**
 * 同行者推荐的实现：取参照行程与开放候选，调用纯函数评分与排序。
 * 方法契约以 {@link routeme.service.RecommendationService} 为准。
 */
@Service
public class RecommendationServiceImpl implements RecommendationService {

    private final TripPlanService tripPlanService;
    private final DemoUserService demoUserService;

    public RecommendationServiceImpl(TripPlanService tripPlanService, DemoUserService demoUserService) {
        this.tripPlanService = tripPlanService;
        this.demoUserService = demoUserService;
    }

    @Override
    public RecommendationResult recommend(long tripId, long userId) {
        DemoUser viewer = demoUserService.require(userId);
        TripPlan reference = tripPlanService.requireCurrent(tripId);
        List<String> interests = viewer.interests();

        List<TravelerRecommendation> candidates = tripPlanService.findOpen(TripQuery.empty()).stream()
                .filter(trip -> trip.id() != reference.id())
                .filter(trip -> trip.publisherId() != viewer.id())
                .map(trip -> new TravelerRecommendation(
                        tripPlanService.publisherOf(trip),
                        trip,
                        TravelerMatch.evaluate(trip, reference, interests)))
                .toList();

        return new RecommendationResult(
                RecommendationReference.of(reference, interests),
                TravelerRecommendationRanker.rank(reference, candidates));
    }
}