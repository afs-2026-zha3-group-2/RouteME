package routeme.dto;

import java.time.Instant;
import routeme.model.DemoUser;
import routeme.model.TripApplication;
import routeme.model.TripPlan;

public record TripApplicationResponse(
        long id,
        long tripId,
        DemoUserResponse applicant,
        String message,
        String status,
        Instant createdAt,
        Instant decidedAt,
        TripSummaryResponse trip) {

    public static TripApplicationResponse from(
            TripApplication application, DemoUser applicant, TripPlan trip, DemoUser publisher) {
        return new TripApplicationResponse(
                application.id(),
                application.tripId(),
                DemoUserResponse.from(applicant),
                application.message(),
                application.status().wireValue(),
                application.createdAt(),
                application.decidedAt(),
                TripSummaryResponse.from(trip, publisher));
    }
}