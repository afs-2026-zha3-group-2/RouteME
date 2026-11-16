package routeme.response;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import routeme.area.AreaNames;
import routeme.pojo.DemoUser;
import routeme.pojo.TripPlan;

public record TripDetailResponse(
        long id,
        String title,
        String destination,
        String destinationCode,
        String provinceCode,
        String provinceName,
        LocalDate startDate,
        LocalDate endDate,
        List<String> stops,
        String meetingArea,
        String note,
        Integer budgetMinCents,
        Integer budgetMaxCents,
        List<String> tags,
        int capacity,
        int joinedCount,
        String status,
        boolean endingSoon,
        DemoUserResponse publisher,
        List<DemoUserResponse> participants,
        Instant completedAt,
        Instant createdAt) {

    public static TripDetailResponse from(
            TripPlan trip, DemoUser publisher, List<DemoUser> participants, Instant now) {
        return new TripDetailResponse(
                trip.id(),
                trip.title(),
                trip.destination(),
                trip.destinationCode(),
                AreaNames.provinceCodeOf(trip.destinationCode()),
                AreaNames.provinceDisplayNameOf(trip.destinationCode()),
                trip.startDate(),
                trip.endDate(),
                trip.stops(),
                trip.meetingArea(),
                trip.note(),
                trip.budgetMinCents(),
                trip.budgetMaxCents(),
                trip.tags(),
                trip.capacity(),
                trip.joinedCount(),
                trip.status(now).wireValue(),
                trip.endingSoon(now),
                DemoUserResponse.from(publisher),
                participants.stream().map(DemoUserResponse::from).toList(),
                trip.completedAt(),
                trip.createdAt());
    }
}