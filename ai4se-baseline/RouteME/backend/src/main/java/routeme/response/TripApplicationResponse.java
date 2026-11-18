package routeme.response;

import java.time.Instant;

import routeme.pojo.DemoUser;
import routeme.pojo.TripApplication;
import routeme.pojo.TripPlan;

public record TripApplicationResponse(
        long id,
        long tripId,
        DemoUserResponse applicant,
        String message,
        String status,
        Instant createdAt,
        Instant decidedAt,
        String statusReason,
        TripSummaryResponse trip) {

    public static TripApplicationResponse from(
            TripApplication application, DemoUser applicant, TripPlan trip, DemoUser publisher, Instant now) {
        return new TripApplicationResponse(
                application.id(),
                application.tripId(),
                DemoUserResponse.from(applicant),
                application.message(),
                application.status().wireValue(),
                application.createdAt(),
                application.decidedAt(),
                application.statusReason(),
                TripSummaryResponse.from(trip, publisher, now));
    }
}