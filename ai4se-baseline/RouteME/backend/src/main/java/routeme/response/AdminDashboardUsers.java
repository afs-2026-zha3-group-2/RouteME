package routeme.response;

import java.util.Map;

import com.fasterxml.jackson.annotation.JsonProperty;

/** 概览的账号计数（schema {@code AdminDashboardUsers}）；状态为有效状态。 */
public record AdminDashboardUsers(
        long total,
        Map<String, Long> byRole,
        Map<String, Long> byStatus,
        @JsonProperty("new_last_7_days") long newLast7Days,
        @JsonProperty("new_last_30_days") long newLast30Days) {
}