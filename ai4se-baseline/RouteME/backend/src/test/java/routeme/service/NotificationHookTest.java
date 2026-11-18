package routeme.service;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

import routeme.config.FixedClockTestConfig;
import routeme.pojo.DemoUser;
import routeme.pojo.Report;
import routeme.response.NotificationResponse;
import routeme.response.ServiceSessionDetailResponse;
import routeme.request.AdminReportResolveRequest;
import routeme.request.ReportRequest;
import routeme.request.UserProfileUpdateRequest;

/**
 * 新增生产方钩子：举报流转、客服会话与身份认证都只在成功路径末尾写通知。
 */
@SpringBootTest
@Transactional
@Import(FixedClockTestConfig.class)
class NotificationHookTest {

    @Autowired
    private ReportService reportService;

    @Autowired
    private AdminReportService adminReportService;

    @Autowired
    private CustomerService customerService;

    @Autowired
    private UserProfileService userProfileService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private DemoUserService demoUserService;

    private DemoUser freshUser() {
        String stamp = UUID.randomUUID().toString().substring(0, 8);
        return demoUserService.createAccount(
                "hook_" + stamp, "hash", "钩子用户", "钩", "hook_" + stamp + "@example.com");
    }

    private List<String> eventsOf(long userId, String type) {
        return notificationService.list(userId).items().stream()
                .filter(item -> type.equals(item.type()))
                .map(NotificationResponse::event)
                .toList();
    }

    @Test
    void in_reportLifecycle_out_submittedProcessingResolved() {
        // Given
        DemoUser reporter = freshUser();
        DemoUser target = demoUserService.findAll().get(1);
        Report report = reportService.submit(
                reporter.id(),
                new ReportRequest("user", target.id(), "harassment", "骚扰", null));

        // When
        adminReportService.start(report.id(), target.id());
        adminReportService.resolve(
                report.id(),
                target.id(),
                new AdminReportResolveRequest("REJECTED", "内部备注XYZ", null, null));

        // Then
        List<NotificationResponse> items = notificationService.list(reporter.id()).items();
        assertAll(
                () -> assertEquals(
                        List.of("report_resolved", "report_processing", "report_submitted"),
                        eventsOf(reporter.id(), "REPORT"),
                        "three report events in newest-first order"),
                () -> assertEquals(3, notificationService.list(reporter.id()).counts().byType().get("REPORT"),
                        "three unread report rows"),
                () -> assertTrue(
                        items.getFirst().content().contains("R-" + report.id()),
                        "content carries the report code"),
                () -> assertEquals("report", items.getFirst().target().kind(), "jump to report detail"),
                () -> assertEquals(report.id(), items.getFirst().target().reportId(), "report target id"),
                () -> assertTrue(items.getFirst().relatedAvailable(), "reporter still owns the report"),
                () -> assertTrue(
                        items.stream().noneMatch(item -> item.content().contains("内部备注XYZ")),
                        "admin note is never copied into notifications"));
    }

    @Test
    void in_serviceSession_out_joinedReplyClosed() {
        // Given
        DemoUser user = freshUser();
        DemoUser admin = demoUserService.findAll().get(0);
        ServiceSessionDetailResponse session = customerService.createOrGet(user.id());

        // When
        customerService.join(session.id(), admin.id());
        customerService.sendAdminMessage(session.id(), admin.id(), "你好，这里是人工客服");
        customerService.resolve(session.id(), admin.id());
        customerService.closeByUser(session.id(), user.id());

        // Then
        assertAll(
                () -> assertEquals(
                        List.of("service_closed", "service_reply", "service_joined"),
                        eventsOf(user.id(), "SERVICE"),
                        "three service events in newest-first order"),
                () -> assertEquals(3, notificationService.list(user.id()).counts().byType().get("SERVICE"),
                        "three unread service rows"),
                () -> assertEquals(
                        "support",
                        notificationService.list(user.id()).items().getFirst().target().kind(),
                        "jump to support"),
                () -> assertEquals(
                        session.id(),
                        notificationService.list(user.id()).items().getFirst().target().sessionId(),
                        "session target id"));
    }

    @Test
    void in_profileCompleted_out_singleIdentityNotification() {
        // Given
        DemoUser user = freshUser();
        UserProfileUpdateRequest request = new UserProfileUpdateRequest(
                "认证用户", "2004-05-01", "女", "广州", "中山大学", "计算机",
                "学生", "INFP", List.of("摄影", "徒步", "美食"), "休闲游", "你好");

        // When: the first complete save emits, the second does not repeat
        userProfileService.save(user.id(), request);
        userProfileService.save(user.id(), request);

        // Then
        assertAll(
                () -> assertEquals(
                        List.of("identity_verified"), eventsOf(user.id(), "SYSTEM"), "one system event"),
                () -> assertEquals(1, notificationService.list(user.id()).counts().byType().get("SYSTEM"),
                        "one unread system row"),
                () -> assertEquals(
                        "identity",
                        notificationService.list(user.id()).items().getFirst().target().kind(),
                        "jump to identity page"));
    }
}