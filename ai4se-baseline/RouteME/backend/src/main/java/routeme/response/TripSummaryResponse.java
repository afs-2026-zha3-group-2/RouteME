package routeme.response;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import routeme.area.AreaNames;
import routeme.pojo.DemoUser;
import routeme.pojo.TripPlan;

public record TripSummaryResponse(
        long id,
        String title,
        String destination,
        String destinationCode,
        String provinceCode,
        String provinceName,
        LocalDate startDate,
        LocalDate endDate,
        List<String> stops,
        List<String> meetingAreas,
        String meetingTime,
        List<String> tags,
        int capacity,
        int joinedCount,
        String status,
        boolean endingSoon,
        DemoUserResponse publisher,
        Instant createdAt) {

    public static TripSummaryResponse from(TripPlan trip, DemoUser publisher, Instant now) {
        return new TripSummaryResponse(
                trip.id(),
                trip.title(),
                trip.destination(),
                trip.destinationCode(),
                AreaNames.provinceCodeOf(trip.destinationCode()),
                AreaNames.provinceDisplayNameOf(trip.destinationCode()),
                trip.startDate(),
                trip.endDate(),
                trip.stops(),
                trip.meetingAreas(),
                trip.meetingTime(),
                trip.tags(),
                trip.capacity(),
                trip.joinedCount(),
                trip.status(now).wireValue(),
                trip.endingSoon(now),
                DemoUserResponse.from(publisher),
                trip.createdAt());
    }
}