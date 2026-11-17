package routeme.response;

import java.util.Map;

/** 概览的客服会话计数（schema {@code AdminDashboardServiceSessions}）。 */
public record AdminDashboardServiceSessions(long total, Map<String, Long> byStatus) {
}