package routeme.controller;

import java.time.Clock;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import routeme.pojo.DemoUser;
import routeme.pojo.RecommendationResult;
import routeme.response.RecommendationListResponse;
import routeme.service.DemoUserService;
import routeme.service.RecommendationService;

@RestController
@RequestMapping("/api/trips/{tripId}/recommendations")
public class RecommendationController {

    private final DemoUserService demoUserService;
    private final RecommendationService recommendationService;
    private final Clock clock;

    public RecommendationController(
            DemoUserService demoUserService,
            RecommendationService recommendationService,
            Clock clock) {
        this.demoUserService = demoUserService;
        this.recommendationService = recommendationService;
        this.clock = clock;
    }

    @GetMapping
    public RecommendationListResponse list(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable long tripId) {
        DemoUser me = demoUserService.require(userId);
        RecommendationResult result = recommendationService.recommend(tripId, me.id());
        return RecommendationListResponse.from(result, clock.instant());
    }
}