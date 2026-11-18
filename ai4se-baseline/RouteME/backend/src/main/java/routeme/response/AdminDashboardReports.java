package routeme.response;

import java.util.Map;

/** 概览的举报计数（schema {@code AdminDashboardReports}）。 */
public record AdminDashboardReports(long total, Map<String, Long> byStatus) {
}