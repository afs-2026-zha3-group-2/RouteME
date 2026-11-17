package routeme.response;

import com.fasterxml.jackson.annotation.JsonProperty;

/** 概览的旅行体验计数（schema {@code AdminDashboardExperiences}）。 */
public record AdminDashboardExperiences(
        long total,
        @JsonProperty("new_last_7_days") long newLast7Days,
        @JsonProperty("new_last_30_days") long newLast30Days) {
}