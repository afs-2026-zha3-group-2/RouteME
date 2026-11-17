package routeme.response;

import java.time.Instant;
import java.util.List;

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
        List<ExperiencePhotoResponse> photos,
        Instant createdAt,
        Instant updatedAt) {

    public static ExperienceResponse from(
            TripExperience experience,
            TripPlan trip,
            DemoUser publisher,
            DemoUser author,
            Instant now,
            List<ExperiencePhotoResponse> photos) {
        return new ExperienceResponse(
                experience.id(),
                TripSummaryResponse.from(trip, publisher, now),
                DemoUserResponse.from(author),
                experience.content(),
                experience.intensity().wireValue(),
                experience.advice(),
                photos == null ? List.of() : photos,
                experience.createdAt(),
                experience.updatedAt());
    }
}
