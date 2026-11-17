package routeme.response;

import java.util.Map;

/** 概览的同行申请计数（schema {@code AdminDashboardApplications}）。 */
public record AdminDashboardApplications(long total, Map<String, Long> byStatus) {
}