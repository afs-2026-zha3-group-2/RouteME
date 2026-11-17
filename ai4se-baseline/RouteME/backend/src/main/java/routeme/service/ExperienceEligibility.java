package routeme.service;

import org.springframework.stereotype.Component;

import java.time.Clock;

import routeme.enums.TripStatusEnum;
import routeme.exception.ExperienceNotAllowedException;
import routeme.pojo.TripPlan;

/**
 * 游后体验（含图片）的分享资格：行程已结束，且当前用户是发布者或已接受同行者。
 */
@Component
public class ExperienceEligibility {

    private final ApplicationService applicationService;
    private final Clock clock;

    public ExperienceEligibility(ApplicationService applicationService, Clock clock) {
        this.applicationService = applicationService;
        this.clock = clock;
    }

    public void requireCanShare(TripPlan trip, long authorId) {
        if (trip.status(clock.instant()) != TripStatusEnum.COMPLETED) {
            throw new ExperienceNotAllowedException(trip.id(), authorId);
        }
        boolean participant = applicationService.participants(trip.id()).stream()
                .anyMatch(user -> user.id() == authorId);
        if (!participant) {
            throw new ExperienceNotAllowedException(trip.id(), authorId);
        }
    }
}
