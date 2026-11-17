package routeme.response;

import java.util.Map;

import com.fasterxml.jackson.annotation.JsonProperty;

/** 概览的行程计数（schema {@code AdminDashboardTrips}）；状态复用五态推导。 */
public record AdminDashboardTrips(
        long total,
        Map<String, Long> byStatus,
        @JsonProperty("new_last_7_days") long newLast7Days,
        @JsonProperty("new_last_30_days") long newLast30Days) {
}