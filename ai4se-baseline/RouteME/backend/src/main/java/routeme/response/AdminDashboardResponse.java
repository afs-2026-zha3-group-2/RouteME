package routeme.response;

import java.time.Instant;

/** 管理后台概览（schema {@code AdminDashboard}）：一次请求、一个时刻的只读快照。 */
public record AdminDashboardResponse(
        AdminDashboardUsers users,
        AdminDashboardTrips trips,
        AdminDashboardApplications applications,
        AdminDashboardExperiences experiences,
        AdminDashboardReports reports,
        AdminDashboardServiceSessions serviceSessions,
        Instant generatedAt) {
}