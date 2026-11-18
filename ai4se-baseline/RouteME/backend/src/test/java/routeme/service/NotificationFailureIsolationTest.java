package routeme.service;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.transaction.annotation.Transactional;

import routeme.config.FixedClockTestConfig;
import routeme.entity.NotificationEntity;
import routeme.enums.ApplicationStatusEnum;
import routeme.pojo.ChatMessage;
import routeme.pojo.DemoUser;
import routeme.pojo.TripApplication;
import routeme.pojo.TripPlan;
import routeme.request.ApplicationCreateRequest;
import routeme.request.ChatMessageRequest;
import routeme.request.TripCreateRequest;
import routeme.response.NotificationCountsResponse;
import routeme.response.NotificationListResponse;
import routeme.service.impl.NotificationServiceImpl;

/**
 * 失败隔离：通知无论如何失败，申请 / 裁决 / 发消息都必须成功；
 * 自己发给自己在服务层直接调用也不写行。
 */
@SpringBootTest
@Transactional
@Import({FixedClockTestConfig.class, NotificationFailureIsolationTest.FailingNotificationConfig.class})
class NotificationFailureIsolationTest {

    @Autowired
    private ApplicationService applicationService;

    @Autowired
    private ChatService chatService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private NotificationServiceImpl notificationServiceImpl;

    @Autowired
    private TripPlanService tripPlanService;

    @Autowired
    private DemoUserService demoUserService;

    @Autowired
    private ObjectProvider<NotificationStreamService> streamServiceProvider;

    @Autowired
    private java.time.Clock clock;

    private DemoUser publisher;
    private DemoUser applicant;
    private TripPlan trip;

    @BeforeEach
    void setUp() {
        List<DemoUser> users = demoUserService.findAll();
        publisher = users.get(0);
        applicant = users.get(1);
        trip = tripPlanService.create(new TripCreateRequest(
                        "通知失败隔离行程", "440100",
                        LocalDate.parse("2026-11-20"), LocalDate.parse("2026-11-20"),
                        List.of("陈家祠地铁站集合", "永庆坊"), List.of("陈家祠地铁站 D 口"),
                        null, null, "失败隔离", null, null, List.of("摄影"), 3, null),
                publisher.id());
    }

    @Test
    void in_notificationThrows_out_businessStillSucceeds() {
        // When: apply / accept / send all run with a notification service that always throws
        TripApplication application = applicationService.apply(
                trip.id(), applicant.id(), new ApplicationCreateRequest("带上我"));
        TripApplication accepted = applicationService.accept(application.id(), publisher.id());
        ChatMessage message = chatService.send(
                trip.id(), applicant.id(), new ChatMessageRequest(publisher.id(), "还能出发吗"));

        // Then
        assertAll(
                () -> assertEquals(ApplicationStatusEnum.ACCEPTED, accepted.status(), "accept still succeeds"),
                () -> assertEquals(applicant.id(), application.applicantId(), "apply still succeeds"),
                () -> assertEquals(applicant.id(), message.senderId(), "send still succeeds"));
    }

    @Test
    void in_saveThrows_out_notifySwallowsAndWritesNothing() {
        // Given
        NotificationServiceImpl failingWrites = new NotificationServiceImpl(
                demoUserService, tripPlanService, streamServiceProvider, clock) {
            @Override
            public boolean save(NotificationEntity entity) {
                throw new IllegalStateException("database unavailable");
            }
        };

        // When / Then
        assertDoesNotThrow(() -> failingWrites.notifyApplicationReceived(
                publisher.id(), applicant.id(), trip.id(), 41L));
    }

    @Test
    void in_selfNotification_out_noRow() {
        // Given
        NotificationCountsResponse before = notificationServiceImpl.list(applicant.id()).counts();
        ChatMessage message = new ChatMessage(55L, trip.id(), applicant.id(), applicant.id(), "自己", clock.instant());

        // When
        notificationServiceImpl.notifyMessage(applicant.id(), applicant.id(), message);

        // Then
        NotificationListResponse after = notificationServiceImpl.list(applicant.id());
        assertAll(
                () -> assertEquals(before.total(), after.counts().total(), "no self notification"),
                () -> assertEquals(0, after.items().size(), "no row written"));
    }

    @TestConfiguration
    static class FailingNotificationConfig {

        @Bean
        @Primary
        NotificationService failingNotificationService(
                DemoUserService demoUserService,
                TripPlanService tripPlanService,
                ObjectProvider<NotificationStreamService> streamServiceProvider,
                java.time.Clock clock) {
            return new NotificationServiceImpl(
                    demoUserService, tripPlanService, streamServiceProvider, clock) {
                @Override
                public boolean save(NotificationEntity entity) {
                    throw new IllegalStateException("notification write failed");
                }
            };
        }    }
}