package routeme.service.impl;

import java.util.List;

import org.springframework.stereotype.Service;

import routeme.entity.UserEntity;
import routeme.exception.UserNotFoundException;
import routeme.pojo.DemoUser;
import routeme.pojo.TripApplication;
import routeme.pojo.TripPlan;
import routeme.response.ProfileStatsResponse;
import routeme.response.UserProfileResponse;
import routeme.service.ApplicationService;
import routeme.service.DemoUserService;
import routeme.service.ExperienceService;
import routeme.service.TripPlanService;
import routeme.service.UserProfileService;

/**
 * 公开资料的只读聚合实现：资料来自 app_users，统计在请求时从行程、申请与体验现算。
 * 方法契约以 {@link routeme.service.UserProfileService} 为准。
 */
@Service
public class UserProfileServiceImpl implements UserProfileService {

    private final DemoUserService demoUserService;
    private final TripPlanService tripPlanService;
    private final ApplicationService applicationService;
    private final ExperienceService experienceService;

    public UserProfileServiceImpl(
            DemoUserService demoUserService,
            TripPlanService tripPlanService,
            ApplicationService applicationService,
            ExperienceService experienceService) {
        this.demoUserService = demoUserService;
        this.tripPlanService = tripPlanService;
        this.applicationService = applicationService;
        this.experienceService = experienceService;
    }

    @Override
    public UserProfileResponse byUserId(long userId) {
        UserEntity entity = demoUserService.getById(userId);
        if (entity == null) {
            throw new UserNotFoundException(userId);
        }
        DemoUser user = entity.toDemoUser();
        List<TripPlan> publishedTrips = tripPlanService.findAllTrips().stream()
                .filter(trip -> trip.publisherId() == userId)
                .toList();
        int completed = (int) publishedTrips.stream()
                .filter(trip -> trip.completedAt() != null)
                .count();
        int joined = (int) applicationService.mine(userId).stream()
                .filter(TripApplication::isAccepted)
                .count();
        int shared = experienceService.mine(userId).size();

        return new UserProfileResponse(
                user.id(),
                user.nickname(),
                user.avatarInitial(),
                user.school(),
                user.bio(),
                user.interests(),
                entity.getCreatedAt(),
                new ProfileStatsResponse(publishedTrips.size(), completed, joined, shared));
    }
}
