package routeme.service.impl;

import java.time.Clock;
import java.time.Instant;

import org.springframework.stereotype.Service;

import routeme.enums.TripStatusEnum;
import routeme.pojo.TripApplication;
import routeme.response.ProfileStatsResponse;
import routeme.service.ApplicationService;
import routeme.service.ExperienceService;
import routeme.service.TripPlanService;
import routeme.service.UserProfileStatsService;

/**
 * 统计口径：发布行程 = 该用户发布的行程数；已完成 = 其发布的已结束行程数（含到期自动完成）；
 * 参与同行 = 被接受的申请数；游后分享 = 其发布的体验数。
 */
@Service
public class UserProfileStatsServiceImpl implements UserProfileStatsService {

    private final TripPlanService tripPlanService;
    private final ApplicationService applicationService;
    private final ExperienceService experienceService;
    private final Clock clock;

    public UserProfileStatsServiceImpl(
            TripPlanService tripPlanService,
            ApplicationService applicationService,
            ExperienceService experienceService,
            Clock clock) {
        this.tripPlanService = tripPlanService;
        this.applicationService = applicationService;
        this.experienceService = experienceService;
        this.clock = clock;
    }

    @Override
    public ProfileStatsResponse stats(long userId) {
        Instant now = clock.instant();
        var publishedTrips = tripPlanService.findAllTrips().stream()
                .filter(trip -> trip.publisherId() == userId)
                .filter(trip -> trip.status(now) != TripStatusEnum.CANCELLED)
                .toList();
        int completed = (int) publishedTrips.stream()
                .filter(trip -> trip.status(now) == TripStatusEnum.COMPLETED)
                .count();
        int joined = (int) applicationService.mine(userId).stream()
                .filter(TripApplication::isAccepted)
                .count();
        int shared = experienceService.mine(userId).size();
        return new ProfileStatsResponse(publishedTrips.size(), completed, joined, shared);
    }
}
