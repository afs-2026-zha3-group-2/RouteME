package routeme.response;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import routeme.pojo.DemoUser;
import routeme.pojo.TripPlan;

public record TripSummaryResponse(
        long id,
        String title,
        String destination,
        LocalDate startDate,
        LocalDate endDate,
        List<String> stops,
        List<String> tags,
        int capacity,
        int joinedCount,
        String status,
        DemoUserResponse publisher,
        Instant createdAt) {

    public static TripSummaryResponse from(TripPlan trip, DemoUser publisher) {
        return new TripSummaryResponse(
                trip.id(),
                trip.title(),
                trip.destination(),
                trip.startDate(),
                trip.endDate(),
                trip.stops(),
                trip.tags(),
                trip.capacity(),
                trip.joinedCount(),
                trip.status().wireValue(),
                DemoUserResponse.from(publisher),
                trip.createdAt());
    }
}