package routeme.service;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

import routeme.config.FixedClockTestConfig;
import routeme.exception.ChatNotAllowedException;
import routeme.exception.DuplicateApplicationException;
import routeme.pojo.ChatMessage;
import routeme.pojo.DemoUser;
import routeme.pojo.TripApplication;
import routeme.pojo.TripPlan;
import routeme.request.ApplicationCreateRequest;
import routeme.request.ChatMessageRequest;
import routeme.request.TripCreateRequest;
import routeme.response.NotificationCountsResponse;
import routeme.response.NotificationResponse;

/**
 * 生产方钩子：只在既有成功路径末尾写通知；被既有规则拒绝的请求不产生行。
 */
@SpringBootTest
@Transactional
@Import(FixedClockTestConfig.class)
class NotificationProducerTest {

    @Autowired
    private ApplicationService applicationService;

    @Autowired
    private ChatService chatService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private TripPlanService tripPlanService;

    @Autowired
    private DemoUserService demoUserService;

    private DemoUser publisher;
    private DemoUser applicant;
    private TripPlan trip;
    private NotificationCountsResponse publisherBaseline;
    private NotificationCountsResponse applicantBaseline;

    @BeforeEach
    void setUp() {
        List<DemoUser> users = demoUserService.findAll();
        publisher = users.get(0);
        applicant = users.get(1);
        trip = tripPlanService.create(new TripCreateRequest(
                        "通知测试行程", "440100", "440100",
                        LocalDate.parse("2026-11-20"), LocalDate.parse("2026-11-20"),
                        List.of("陈家祠地铁站集合", "永庆坊"), List.of("陈家祠地铁站 D 口"),
                        null, null, "通知钩子测试", null, null, List.of("摄影"), 3, null),
                publisher.id());
        publisherBaseline = notificationService.list(publisher.id()).counts();
        applicantBaseline = notificationService.list(applicant.id()).counts();
    }

    private long publisherTotal() {
        return notificationService.list(publisher.id()).counts().total() - publisherBaseline.total();
    }

    private long applicantTotal() {
        return notificationService.list(applicant.id()).counts().total() - applicantBaseline.total();
    }

    @Test
    void in_apply_out_publisherNotified() {
        // When
        TripApplication application = applicationService.apply(
                trip.id(), applicant.id(), new ApplicationCreateRequest("带上我"));

        // Then
        List<NotificationResponse> items = notificationService.list(publisher.id()).items();
        assertAll(
                () -> assertEquals(1, publisherTotal(), "publisher unread"),
                () -> assertEquals(
                        publisherBaseline.byType().get("APPLICATION") + 1,
                        notificationService.list(publisher.id()).counts().byType().get("APPLICATION"),
                        "application count"),
                () -> assertEquals("APPLICATION", items.getFirst().type(), "type"),
                () -> assertEquals("application_received", items.getFirst().event(), "event"),
                () -> assertEquals(applicant.id(), items.getFirst().actor().id(), "actor is the applicant"),
                () -> assertEquals(application.id(), items.getFirst().applicationId(), "application linked"),
                () -> assertEquals("applications", items.getFirst().target().kind(), "jump to handling"),
                () -> assertEquals(0, applicantTotal(),
                        "applicant is not notified about own application"));
    }

    @Test
    void in_accept_out_applicantNotified() {
        // Given
        TripApplication application = applicationService.apply(
                trip.id(), applicant.id(), new ApplicationCreateRequest("带上我"));

        // When
        applicationService.accept(application.id(), publisher.id());

        // Then
        NotificationResponse item = notificationService.list(applicant.id()).items().getFirst();
        assertAll(
                () -> assertEquals(1, applicantTotal(), "applicant unread"),
                () -> assertEquals("APPLICATION", item.type(), "type"),
                () -> assertEquals("application_accepted", item.event(), "event"),
                () -> assertEquals(publisher.id(), item.actor().id(), "actor is the publisher"),
                () -> assertEquals(application.id(), item.applicationId(), "application linked"),
                () -> assertEquals("trip", item.target().kind(), "accepted jumps to trip detail"),
                () -> assertEquals(1, publisherTotal(),
                        "publisher keeps only the received notification"));
    }

    @Test
    void in_reject_out_applicantNotified() {
        // Given
        DemoUser other = demoUserService.findAll().get(2);
        long otherBaseline = notificationService.list(other.id()).counts().total();
        TripApplication application = applicationService.apply(
                trip.id(), other.id(), new ApplicationCreateRequest("带上我"));

        // When
        applicationService.reject(application.id(), publisher.id());

        // Then
        NotificationResponse item = notificationService.list(other.id()).items().getFirst();
        assertAll(
                () -> assertEquals(
                        otherBaseline + 1, notificationService.list(other.id()).counts().total(), "applicant unread"),
                () -> assertEquals("application_rejected", item.event(), "event"),
                () -> assertEquals(publisher.id(), item.actor().id(), "actor is the publisher"));
    }

    @Test
    void in_duplicateApply_out_noExtraNotification() {
        // Given
        applicationService.apply(trip.id(), applicant.id(), new ApplicationCreateRequest("第一次"));

        // When
        assertThrows(
                DuplicateApplicationException.class,
                () -> applicationService.apply(trip.id(), applicant.id(), new ApplicationCreateRequest("第二次")));

        // Then
        assertEquals(1, publisherTotal(), "rejected request adds no row");
    }

    @Test
    void in_send_out_receiverNotified() {
        // Given
        TripApplication application = applicationService.apply(
                trip.id(), applicant.id(), new ApplicationCreateRequest("带上我"));
        applicationService.accept(application.id(), publisher.id());
        long unreadBefore = notificationService.list(publisher.id()).counts().total();

        // When
        ChatMessage message = chatService.send(
                trip.id(), applicant.id(), new ChatMessageRequest(publisher.id(), "出发时间定了吗"));

        // Then
        NotificationResponse item = notificationService.list(publisher.id()).items().getFirst();
        assertAll(
                () -> assertEquals(unreadBefore + 1, notificationService.list(publisher.id()).counts().total(),
                        "receiver gets one message notification"),
                () -> assertEquals(
                        publisherBaseline.byType().get("CHAT") + 1,
                        notificationService.list(publisher.id()).counts().byType().get("CHAT"),
                        "chat count"),
                () -> assertEquals("CHAT", item.type(), "type"),
                () -> assertEquals("message", item.event(), "event"),
                () -> assertEquals(message.id(), item.messageId(), "message linked"),
                () -> assertEquals(applicant.id(), item.actor().id(), "actor is the sender"),
                () -> assertTrue(item.target().kind().equals("chat"), "jump to conversation"));
    }

    @Test
    void in_selfMessage_out_forbiddenAndNoNotification() {
        // Given
        TripApplication application = applicationService.apply(
                trip.id(), applicant.id(), new ApplicationCreateRequest("带上我"));
        applicationService.accept(application.id(), publisher.id());
        long unreadBefore = notificationService.list(applicant.id()).counts().total();

        // When
        assertThrows(
                ChatNotAllowedException.class,
                () -> chatService.send(
                        trip.id(), applicant.id(), new ChatMessageRequest(applicant.id(), "自言自语")));

        // Then
        assertEquals(unreadBefore, notificationService.list(applicant.id()).counts().total(), "no self notification");
    }
}