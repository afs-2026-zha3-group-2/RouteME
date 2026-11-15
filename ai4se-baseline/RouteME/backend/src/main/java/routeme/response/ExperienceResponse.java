package routeme.response;

import java.time.Instant;

import routeme.pojo.DemoUser;
import routeme.pojo.TripExperience;
import routeme.pojo.TripPlan;

public record ExperienceResponse(
        long id,
        TripSummaryResponse trip,
        DemoUserResponse author,
        String content,
        String intensity,
        String advice,
        Instant createdAt,
        Instant updatedAt) {

    public static ExperienceResponse from(
            TripExperience experience, TripPlan trip, DemoUser publisher, DemoUser author) {
        return new ExperienceResponse(
                experience.id(),
                TripSummaryResponse.from(trip, publisher),
                DemoUserResponse.from(author),
                experience.content(),
                experience.intensity().wireValue(),
                experience.advice(),
                experience.createdAt(),
                experience.updatedAt());
    }
}