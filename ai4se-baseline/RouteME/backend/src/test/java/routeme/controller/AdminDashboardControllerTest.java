package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;

import routeme.config.FixedClockTestConfig;
import routeme.entity.CustomerServiceSessionEntity;
import routeme.entity.ReportEntity;
import routeme.entity.TripApplicationEntity;
import routeme.entity.TripExperienceEntity;
import routeme.entity.TripPlanEntity;
import routeme.entity.UserEntity;
import routeme.enums.ApplicationStatusEnum;
import routeme.mapper.CustomerServiceSessionMapper;
import routeme.mapper.ReportMapper;
import routeme.mapper.TripApplicationMapper;
import routeme.mapper.TripExperienceMapper;
import routeme.mapper.TripPlanMapper;
import routeme.mapper.UserMapper;
import routeme.service.AccountStatusService;

/**
 * Admin dashboard (REQ-023): read-only aggregation contract A1-A8.
 *
 * <p>The shared seeded database makes absolute values unstable, so each case inserts fixtures and
 * asserts deltas plus invariants; the endpoint keeps no cache and must not materialize trips.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(FixedClockTestConfig.class)
@Transactional
class AdminDashboardControllerTest {

    private static final String EXPIRED_BAN = "2026-11-15T00:00:00Z";
    private static final String ACTIVE_BAN = "2026-12-01T00:00:00Z";
    private static final AtomicLong IDS = new AtomicLong(900_000);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AccountStatusService accountStatusService;

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private TripPlanMapper tripPlanMapper;

    @Autowired
    private TripApplicationMapper applicationMapper;

    @Autowired
    private TripExperienceMapper experienceMapper;

    @Autowired
    private ReportMapper reportMapper;

    @Autowired
    private CustomerServiceSessionMapper sessionMapper;

    @Test
    void in_adminBearer_out_sixGroupsWithFixedKeys() throws Exception {
        String admin = login("admin", "admin12345");

        String raw = fetchRaw(admin);
        Map<String, Object> body = parse(raw);

        assertEquals(
                Set.of("users", "trips", "applications", "experiences", "reports", "service_sessions",
                        "generated_at"),
                body.keySet(),
                "dashboard groups");
        assertEquals(
                Set.of("total", "by_role", "by_status", "new_last_7_days", "new_last_30_days"),
                section(body, "users").keySet(),
                "users keys");
        assertEquals(
                Set.of("total", "by_status", "new_last_7_days", "new_last_30_days"),
                section(body, "trips").keySet(),
                "trips keys");
        assertEquals(Set.of("total", "by_status"), section(body, "applications").keySet(), "applications keys");
        assertEquals(
                Set.of("total", "new_last_7_days", "new_last_30_days"),
                section(body, "experiences").keySet(),
                "experiences keys");
        assertEquals(Set.of("total", "by_status"), section(body, "reports").keySet(), "reports keys");
        assertEquals(
                Set.of("total", "by_status"),
                section(body, "service_sessions").keySet(),
                "service sessions keys");
        assertEquals(
                Set.of("USER", "ADMIN"),
                section(section(body, "users"), "by_role").keySet(),
                "role buckets");
        assertEquals(
                Set.of("ACTIVE", "SUSPENDED", "BANNED"),
                section(section(body, "users"), "by_status").keySet(),
                "user status buckets");
        assertEquals(
                Set.of("recruiting", "full", "ongoing", "completed", "cancelled"),
                section(section(body, "trips"), "by_status").keySet(),
                "trip status buckets");
        assertEquals(
                Set.of("pending", "accepted", "rejected", "cancelled", "left"),
                section(section(body, "applications"), "by_status").keySet(),
                "application status buckets");
        assertEquals(
                Set.of("PENDING", "PROCESSING", "RESOLVED", "REJECTED"),
                section(section(body, "reports"), "by_status").keySet(),
                "report status buckets");
        assertEquals(
                Set.of("WAITING", "HANDLING", "CLOSED"),
                section(section(body, "service_sessions"), "by_status").keySet(),
                "service session status buckets");
        assertEquals(FixedClockTestConfig.NOW, Instant.parse((String) body.get("generated_at")), "generated_at");
        assertAllCountsNonNegative(body);
        assertFalse(raw.contains("nickname") || raw.contains("email") || raw.contains("avatar"),
                "dashboard response carries no PII");
    }

    @Test
    void in_missingBearer_out_sessionInvalid() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_INVALID"))
                .andExpect(jsonPath("$.users").doesNotExist());
    }

    @Test
    void in_normalUser_out_adminRequired() throws Exception {
        String user = register("DashboardUser");

        mockMvc.perform(get("/api/admin/dashboard").header("Authorization", bearer(user)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ADMIN_REQUIRED"))
                .andExpect(jsonPath("$.users").doesNotExist());
    }

    @Test
    void in_suspendedAdmin_out_accountSuspended() throws Exception {
        String admin = login("admin", "admin12345");
        accountStatusService.suspend(userId(admin), userId(admin), "temporary", false);

        mockMvc.perform(get("/api/admin/dashboard").header("Authorization", bearer(admin)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCOUNT_SUSPENDED"));
    }

    @Test
    void in_newTripAndReport_out_visibleImmediately() throws Exception {
        String admin = login("admin", "admin12345");
        Map<String, Object> before = fetch(admin);

        insertTrip(userId(admin), "2026-12-10", "2026-12-12", 3, 1, FixedClockTestConfig.NOW.toString());
        insertReport(userId(admin), userId(admin), "PENDING", FixedClockTestConfig.NOW.toString());

        Map<String, Object> after = fetch(admin);

        assertEquals(total(before, "trips") + 1, total(after, "trips"), "trips total");
        assertEquals(bucket(before, "trips", "recruiting") + 1, bucket(after, "trips", "recruiting"),
                "recruiting bucket");
        assertEquals(total(before, "reports") + 1, total(after, "reports"), "reports total");
        assertEquals(bucket(before, "reports", "PENDING") + 1, bucket(after, "reports", "PENDING"),
                "pending bucket");
    }

    @Test
    void in_dashboardGet_out_doesNotMaterializeExpiredTrips() throws Exception {
        String admin = login("admin", "admin12345");
        long tripId = insertTrip(userId(admin), "2026-11-01", "2026-11-02", 3, 1,
                FixedClockTestConfig.NOW.toString());

        fetch(admin);

        assertNull(tripPlanMapper.selectById(tripId).getCompletedAt(),
                "dashboard must not write completed_at");
    }

    @Test
    void in_emptyGroup_out_zeroFilledKeys() throws Exception {
        String admin = login("admin", "admin12345");
        reportMapper.delete(null);
        applicationMapper.delete(null);

        Map<String, Object> body = fetch(admin);

        assertEquals(0L, total(body, "reports"), "empty reports total");
        assertEquals(0L, bucket(body, "reports", "PENDING"), "empty pending");
        assertEquals(0L, bucket(body, "reports", "PROCESSING"), "empty processing");
        assertEquals(0L, bucket(body, "reports", "RESOLVED"), "empty resolved");
        assertEquals(0L, bucket(body, "reports", "REJECTED"), "empty rejected");
        assertEquals(0L, total(body, "applications"), "empty applications total");
        assertEquals(0L, bucket(body, "applications", "pending"), "empty pending applications");
        assertEquals(0L, bucket(body, "applications", "left"), "empty left applications");
    }

    @Test
    void in_expiredBan_out_countedActive() throws Exception {
        String admin = login("admin", "admin12345");
        String target = register("ExpiredBanUser");
        Map<String, Object> before = fetch(admin);

        UserEntity entity = userMapper.selectById(userId(target));
        entity.setStatus("BANNED");
        entity.setBanExpiresAt(EXPIRED_BAN);
        userMapper.updateById(entity);

        Map<String, Object> expired = fetch(admin);
        assertEquals(total(before, "users"), total(expired, "users"), "expired ban keeps total");
        assertEquals(bucket(before, "users", "ACTIVE"), bucket(expired, "users", "ACTIVE"),
                "expired ban still counts active");
        assertEquals(bucket(before, "users", "BANNED"), bucket(expired, "users", "BANNED"),
                "expired ban does not count banned");

        entity = userMapper.selectById(userId(target));
        entity.setBanExpiresAt(ACTIVE_BAN);
        userMapper.updateById(entity);

        Map<String, Object> banned = fetch(admin);
        assertEquals(bucket(before, "users", "ACTIVE") - 1, bucket(banned, "users", "ACTIVE"),
                "active ban leaves active");
        assertEquals(bucket(before, "users", "BANNED") + 1, bucket(banned, "users", "BANNED"),
                "active ban counts banned");
        assertEquals(total(before, "users"), total(banned, "users"), "ban keeps total");
    }

    @Test
    void in_cancelledTripAndAllApplicationStatuses_out_counted() throws Exception {
        String admin = login("admin", "admin12345");
        Map<String, Object> before = fetch(admin);

        long tripId = insertTrip(userId(admin), "2026-12-10", "2026-12-12", 3, 1,
                FixedClockTestConfig.NOW.toString());
        Map<String, Object> recruited = fetch(admin);
        assertEquals(bucket(before, "trips", "recruiting") + 1, bucket(recruited, "trips", "recruiting"),
                "new trip is recruiting");

        TripPlanEntity trip = tripPlanMapper.selectById(tripId);
        trip.setCancelledAt(FixedClockTestConfig.NOW.toString());
        tripPlanMapper.updateById(trip);

        Map<String, Object> cancelled = fetch(admin);
        assertEquals(total(recruited, "trips"), total(cancelled, "trips"), "cancel keeps total");
        assertEquals(bucket(recruited, "trips", "recruiting") - 1, bucket(cancelled, "trips", "recruiting"),
                "cancel leaves recruiting");
        assertEquals(bucket(before, "trips", "cancelled") + 1, bucket(cancelled, "trips", "cancelled"),
                "cancel counts cancelled");

        for (ApplicationStatusEnum status : ApplicationStatusEnum.values()) {
            insertApplication(tripId, userId(admin), status, FixedClockTestConfig.NOW.toString());
        }

        Map<String, Object> applied = fetch(admin);
        assertEquals(total(cancelled, "applications") + 5, total(applied, "applications"), "applications total");
        for (ApplicationStatusEnum status : ApplicationStatusEnum.values()) {
            assertEquals(bucket(cancelled, "applications", status.wireValue()) + 1,
                    bucket(applied, "applications", status.wireValue()), status.wireValue() + " bucket");
        }
    }

    @Test
    void in_anySnapshot_out_totalsMatchBuckets() throws Exception {
        String admin = login("admin", "admin12345");
        Map<String, Object> body = fetch(admin);

        Map<String, Object> users = section(body, "users");
        assertEquals(total(body, "users"), sum(section(users, "by_role")), "users total = roles");
        assertEquals(total(body, "users"), sum(section(users, "by_status")), "users total = statuses");
        assertEquals(total(body, "trips"), sum(section(section(body, "trips"), "by_status")), "trips total");
        assertEquals(total(body, "applications"),
                sum(section(section(body, "applications"), "by_status")), "applications total");
        assertEquals(total(body, "reports"), sum(section(section(body, "reports"), "by_status")), "reports total");
        assertEquals(total(body, "service_sessions"),
                sum(section(section(body, "service_sessions"), "by_status")), "service sessions total");
    }

    @Test
    void in_windowBoundaries_out_countedByShanghaiDay() throws Exception {
        String admin = login("admin", "admin12345");
        Map<String, Object> before = fetch(admin);

        // today 00:00, today-6 00:00, today-7 00:00 minus one second,
        // today-29 00:00, today-30 00:00 minus one second (Asia/Shanghai).
        insertExperienceOwnedByAdmin(admin, "2026-11-16T00:00:00+08:00");
        insertExperienceOwnedByAdmin(admin, "2026-11-10T00:00:00+08:00");
        insertExperienceOwnedByAdmin(admin, "2026-11-09T23:59:59+08:00");
        insertExperienceOwnedByAdmin(admin, "2026-10-18T00:00:00+08:00");
        insertExperienceOwnedByAdmin(admin, "2026-10-17T23:59:59+08:00");
        // Future timestamps enlarge the total but never the "new" windows.
        insertExperienceOwnedByAdmin(admin, "2026-11-20T00:00:00Z");

        Map<String, Object> after = fetch(admin);
        Map<String, Object> experiences = section(after, "experiences");

        assertEquals(total(before, "experiences") + 6, total(after, "experiences"), "experience total");
        assertEquals(value(section(before, "experiences"), "new_last_7_days") + 2,
                value(experiences, "new_last_7_days"), "7 day window");
        assertEquals(value(section(before, "experiences"), "new_last_30_days") + 4,
                value(experiences, "new_last_30_days"), "30 day window");
    }

    @Test
    void in_sessionStatuses_out_counted() throws Exception {
        String admin = login("admin", "admin12345");
        Map<String, Object> before = fetch(admin);

        insertSession(userId(admin), "WAITING");
        insertSession(userId(admin), "HANDLING");
        insertSession(userId(admin), "CLOSED");

        Map<String, Object> after = fetch(admin);
        assertEquals(total(before, "service_sessions") + 3, total(after, "service_sessions"), "sessions total");
        assertEquals(bucket(before, "service_sessions", "WAITING") + 1,
                bucket(after, "service_sessions", "WAITING"), "WAITING bucket");
        assertEquals(bucket(before, "service_sessions", "HANDLING") + 1,
                bucket(after, "service_sessions", "HANDLING"), "HANDLING bucket");
        assertEquals(bucket(before, "service_sessions", "CLOSED") + 1,
                bucket(after, "service_sessions", "CLOSED"), "CLOSED bucket");
    }

    private long insertTrip(
            long publisherId,
            String startDate,
            String endDate,
            int capacity,
            int joinedCount,
            String createdAt) {
        TripPlanEntity entity = new TripPlanEntity();
        entity.setId(IDS.incrementAndGet());
        entity.setPublisherId(publisherId);
        entity.setTitle("Dashboard fixture");
        entity.setDestinationCode("zhuhai");
        entity.setDestination("珠海");
        entity.setStartDate(startDate);
        entity.setEndDate(endDate);
        entity.setStops("[\"a\",\"b\"]");
        entity.setMeetingAreas("[]");
        entity.setTags("[]");
        entity.setCapacity(capacity);
        entity.setJoinedCount(joinedCount);
        entity.setCreatedAt(createdAt);
        entity.setUpdatedAt(createdAt);
        tripPlanMapper.insert(entity);
        return entity.getId();
    }

    private void insertApplication(long tripId, long applicantId, ApplicationStatusEnum status, String createdAt) {
        TripApplicationEntity entity = new TripApplicationEntity();
        entity.setId(IDS.incrementAndGet());
        entity.setTripId(tripId);
        entity.setApplicantId(applicantId);
        entity.setStatus(status.name());
        entity.setCreatedAt(createdAt);
        applicationMapper.insert(entity);
    }

    private void insertExperienceOwnedByAdmin(String adminSession, String createdAt) {
        long tripId = insertTrip(userId(adminSession), "2026-12-10", "2026-12-12", 3, 1,
                FixedClockTestConfig.NOW.toString());
        insertExperience(tripId, userId(adminSession), createdAt);
    }

    private void insertExperience(long tripId, long authorId, String createdAt) {
        TripExperienceEntity entity = new TripExperienceEntity();
        entity.setId(IDS.incrementAndGet());
        entity.setTripId(tripId);
        entity.setAuthorId(authorId);
        entity.setContent("窗口夹具");
        entity.setIntensity("MODERATE");
        entity.setAdvice("无");
        entity.setCreatedAt(createdAt);
        entity.setUpdatedAt(createdAt);
        experienceMapper.insert(entity);
    }

    private void insertReport(long reporterId, long targetId, String status, String createdAt) {
        ReportEntity entity = new ReportEntity();
        entity.setId(IDS.incrementAndGet());
        entity.setTargetType("user");
        entity.setTargetId(targetId);
        entity.setReporterId(reporterId);
        entity.setReason("safety");
        entity.setStatus(status);
        entity.setCreatedAt(createdAt);
        reportMapper.insert(entity);
    }

    private void insertSession(long userId, String status) {
        CustomerServiceSessionEntity entity = new CustomerServiceSessionEntity();
        entity.setId(IDS.incrementAndGet());
        entity.setUserId(userId);
        entity.setStatus(status);
        entity.setCreatedAt(FixedClockTestConfig.NOW.toString());
        sessionMapper.insert(entity);
    }

    private String fetchRaw(String session) throws Exception {
        return mockMvc.perform(get("/api/admin/dashboard").header("Authorization", bearer(session)))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andReturn().getResponse().getContentAsString();
    }

    private Map<String, Object> fetch(String session) throws Exception {
        return parse(fetchRaw(session));
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parse(String raw) {
        return JsonPath.read(raw, "$");
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> section(Map<String, Object> body, String name) {
        return (Map<String, Object>) body.get(name);
    }

    private static long total(Map<String, Object> body, String name) {
        return value(section(body, name), "total");
    }

    private static long bucket(Map<String, Object> body, String name, String key) {
        return value(section(section(body, name), "by_status"), key);
    }

    private static long value(Map<String, Object> map, String key) {
        return ((Number) map.get(key)).longValue();
    }

    private static long sum(Map<String, Object> counts) {
        return counts.values().stream().mapToLong(item -> ((Number) item).longValue()).sum();
    }

    private static void assertAllCountsNonNegative(Object node) {
        if (node instanceof Map<?, ?> map) {
            map.forEach((key, value) -> {
                if ("generated_at".equals(key)) {
                    return;
                }
                if (value instanceof Number number) {
                    assertTrue(number.longValue() >= 0, key + " is non-negative");
                } else {
                    assertAllCountsNonNegative(value);
                }
            });
            return;
        }
        throw new AssertionError("unexpected dashboard leaf: " + node);
    }

    private String register(String nickname) throws Exception {
        String body = """
                {"username":"%s","password":"routeme-demo","nickname":"%s"}
                """.formatted(uniqueUsername(), nickname);
        return mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
    }

    private String login(String username, String password) throws Exception {
        String body = """
                {"username":"%s","password":"%s"}
                """.formatted(username, password);
        return mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    private static String bearer(String session) {
        return "Bearer " + JsonPath.read(session, "$.token");
    }

    private static long userId(String session) {
        Number id = JsonPath.read(session, "$.user.id");
        return id.longValue();
    }

    private static String uniqueUsername() {
        return "u" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }
}