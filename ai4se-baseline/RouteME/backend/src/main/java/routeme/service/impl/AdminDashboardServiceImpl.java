package routeme.service.impl;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import routeme.constant.TripTimeZoneConstant;
import routeme.entity.CustomerServiceSessionEntity;
import routeme.entity.ReportEntity;
import routeme.entity.TripApplicationEntity;
import routeme.entity.TripExperienceEntity;
import routeme.entity.TripPlanEntity;
import routeme.entity.UserEntity;
import routeme.enums.AccountRoleEnum;
import routeme.enums.ApplicationStatusEnum;
import routeme.enums.ReportStatusEnum;
import routeme.enums.ServiceSessionStatusEnum;
import routeme.mapper.CustomerServiceSessionMapper;
import routeme.mapper.ReportMapper;
import routeme.mapper.TripApplicationMapper;
import routeme.mapper.TripExperienceMapper;
import routeme.mapper.TripPlanMapper;
import routeme.mapper.UserMapper;
import routeme.response.AdminDashboardApplications;
import routeme.response.AdminDashboardExperiences;
import routeme.response.AdminDashboardReports;
import routeme.response.AdminDashboardResponse;
import routeme.response.AdminDashboardServiceSessions;
import routeme.response.AdminDashboardTrips;
import routeme.response.AdminDashboardUsers;
import routeme.service.AccountStatusService;
import routeme.service.AdminDashboardService;

/**
 * 概览聚合：一个 {@link Instant}、六次全表读取、内存分桶与零填充。
 *
 * <p>刻意不调用 {@code TripPlanService.findAllTrips()}：它带事务并先物化过期行程（写库），
 * 概览是只读 GET。行程五态仍复用 {@code TripPlan.status(now)}，账号状态复用
 * {@link AccountStatusService#effectiveStatus(UserEntity)}，不复制判定。</p>
 */
@Service
public class AdminDashboardServiceImpl implements AdminDashboardService {

    private static final List<String> ROLE_KEYS = List.of("USER", "ADMIN");
    private static final List<String> USER_STATUS_KEYS = List.of("ACTIVE", "SUSPENDED", "BANNED");
    private static final List<String> TRIP_STATUS_KEYS =
            List.of("recruiting", "full", "ongoing", "completed", "cancelled");
    private static final List<String> APPLICATION_STATUS_KEYS =
            List.of("pending", "accepted", "rejected", "cancelled", "left");
    private static final List<String> REPORT_STATUS_KEYS = List.of("PENDING", "PROCESSING", "RESOLVED", "REJECTED");
    private static final List<String> SERVICE_SESSION_STATUS_KEYS =
            List.of("WAITING", "HANDLING", "RESOLVED", "CLOSED");

    private final UserMapper userMapper;
    private final TripPlanMapper tripPlanMapper;
    private final TripApplicationMapper applicationMapper;
    private final TripExperienceMapper experienceMapper;
    private final ReportMapper reportMapper;
    private final CustomerServiceSessionMapper sessionMapper;
    private final AccountStatusService accountStatusService;
    private final Clock clock;

    public AdminDashboardServiceImpl(
            UserMapper userMapper,
            TripPlanMapper tripPlanMapper,
            TripApplicationMapper applicationMapper,
            TripExperienceMapper experienceMapper,
            ReportMapper reportMapper,
            CustomerServiceSessionMapper sessionMapper,
            AccountStatusService accountStatusService,
            Clock clock) {
        this.userMapper = userMapper;
        this.tripPlanMapper = tripPlanMapper;
        this.applicationMapper = applicationMapper;
        this.experienceMapper = experienceMapper;
        this.reportMapper = reportMapper;
        this.sessionMapper = sessionMapper;
        this.accountStatusService = accountStatusService;
        this.clock = clock;
    }

    @Override
    public AdminDashboardResponse overview() {
        Instant now = clock.instant();
        LocalDate today = LocalDate.ofInstant(now, TripTimeZoneConstant.ZONE);
        Instant sevenDayStart = today.minusDays(6).atStartOfDay(TripTimeZoneConstant.ZONE).toInstant();
        Instant thirtyDayStart = today.minusDays(29).atStartOfDay(TripTimeZoneConstant.ZONE).toInstant();

        List<UserEntity> users = userMapper.selectList(null);
        Map<String, Long> byRole = zeroFilled(ROLE_KEYS);
        Map<String, Long> byUserStatus = zeroFilled(USER_STATUS_KEYS);
        long newUsers7 = 0;
        long newUsers30 = 0;
        for (UserEntity user : users) {
            merge(byRole, AccountRoleEnum.of(user.getRole()).code());
            merge(byUserStatus, accountStatusService.effectiveStatus(user).code());
            newUsers7 += isWithinWindow(user.getCreatedAt(), sevenDayStart, now) ? 1 : 0;
            newUsers30 += isWithinWindow(user.getCreatedAt(), thirtyDayStart, now) ? 1 : 0;
        }

        List<TripPlanEntity> trips = tripPlanMapper.selectList(null);
        Map<String, Long> byTripStatus = zeroFilled(TRIP_STATUS_KEYS);
        long newTrips7 = 0;
        long newTrips30 = 0;
        for (TripPlanEntity trip : trips) {
            merge(byTripStatus, trip.toTripPlan().status(now).wireValue());
            newTrips7 += isWithinWindow(trip.getCreatedAt(), sevenDayStart, now) ? 1 : 0;
            newTrips30 += isWithinWindow(trip.getCreatedAt(), thirtyDayStart, now) ? 1 : 0;
        }

        List<TripApplicationEntity> applications = applicationMapper.selectList(null);
        Map<String, Long> byApplicationStatus = zeroFilled(APPLICATION_STATUS_KEYS);
        for (TripApplicationEntity application : applications) {
            merge(byApplicationStatus, ApplicationStatusEnum.valueOf(application.getStatus()).wireValue());
        }

        List<TripExperienceEntity> experiences = experienceMapper.selectList(null);
        long newExperiences7 = 0;
        long newExperiences30 = 0;
        for (TripExperienceEntity experience : experiences) {
            newExperiences7 += isWithinWindow(experience.getCreatedAt(), sevenDayStart, now) ? 1 : 0;
            newExperiences30 += isWithinWindow(experience.getCreatedAt(), thirtyDayStart, now) ? 1 : 0;
        }

        List<ReportEntity> reports = reportMapper.selectList(null);
        Map<String, Long> byReportStatus = zeroFilled(REPORT_STATUS_KEYS);
        for (ReportEntity report : reports) {
            merge(byReportStatus, ReportStatusEnum.of(report.getStatus()).code());
        }

        List<CustomerServiceSessionEntity> sessions = sessionMapper.selectList(null);
        Map<String, Long> bySessionStatus = zeroFilled(SERVICE_SESSION_STATUS_KEYS);
        for (CustomerServiceSessionEntity session : sessions) {
            merge(bySessionStatus, ServiceSessionStatusEnum.of(session.getStatus()).code());
        }

        return new AdminDashboardResponse(
                new AdminDashboardUsers(users.size(), byRole, byUserStatus, newUsers7, newUsers30),
                new AdminDashboardTrips(trips.size(), byTripStatus, newTrips7, newTrips30),
                new AdminDashboardApplications(applications.size(), byApplicationStatus),
                new AdminDashboardExperiences(experiences.size(), newExperiences7, newExperiences30),
                new AdminDashboardReports(reports.size(), byReportStatus),
                new AdminDashboardServiceSessions(sessions.size(), bySessionStatus),
                now);
    }

    /** 固定键序、全部为 0 的可变计数表，保证空库也返回完整键集合。 */
    static Map<String, Long> zeroFilled(List<String> keys) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (String key : keys) {
            counts.put(key, 0L);
        }
        return counts;
    }

    static void merge(Map<String, Long> counts, String key) {
        counts.merge(key, 1L, Long::sum);
    }

    /** {@code [windowStart, now]} 闭区间；缺失、空白或无法解析的时间戳不计入新增。 */
    static boolean isWithinWindow(String createdAt, Instant windowStart, Instant now) {
        if (createdAt == null || createdAt.isBlank()) {
            return false;
        }
        Instant created;
        try {
            created = Instant.parse(createdAt);
        } catch (DateTimeParseException exception) {
            return false;
        }
        return !created.isBefore(windowStart) && !created.isAfter(now);
    }
}