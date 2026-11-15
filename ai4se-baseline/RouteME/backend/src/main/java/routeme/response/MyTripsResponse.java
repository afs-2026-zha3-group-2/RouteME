package routeme.response;

import java.util.List;

public record MyTripsResponse(
        List<TripSummaryResponse> published,
        List<TripApplicationResponse> applied,
        List<TripSummaryResponse> matched,
        List<TripSummaryResponse> completed,
        int pendingApplicationCount) {
}