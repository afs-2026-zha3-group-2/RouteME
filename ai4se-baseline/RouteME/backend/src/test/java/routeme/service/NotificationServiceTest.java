package routeme.service;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import routeme.enums.NotificationTypeEnum;
import routeme.exception.NotificationNotFoundException;
import routeme.pojo.ChatMessage;
import routeme.pojo.DemoUser;
import routeme.pojo.TripPlan;
import routeme.response.NotificationCountsResponse;
import routeme.response.NotificationListResponse;
import routeme.response.NotificationResponse;

/**
 * 通知写入、列表、三项计数与三种标读范围。计数一律按相对值断言，不依赖种子行号。
 */
@SpringBootTest
@Transactional
class NotificationServiceTest {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private DemoUserService demoUserService;

    @Autowired
    private TripPlanService tripPlanService;

    @Autowired
    private Clock clock;

    private DemoUser recipient;
    private DemoUser actor;
    private TripPlan trip;

    @BeforeEach
    void setUp() {
        List<DemoUser> users = demoUserService.findAll();
        recipient = users.get(0);
        actor = users.get(1);
        trip = tripPlanService.findAllTrips().get(0);
    }

    @Test
    void in_applicationEvent_out_countsAndRow() {
        // When
        notificationService.notifyApplicationReceived(
                recipient.id(), actor.id(), trip.id(), 41L);

        // Then
        NotificationListResponse list = notificationService.list(recipient.id());
        NotificationCountsResponse counts = list.counts();
        NotificationResponse item = list.items().getFirst();
        assertAll(
                () -> assertEquals(1, counts.total(), "total unread"),
                () -> assertEquals(1, counts.application(), "application unread"),
                () -> assertEquals(0, counts.message(), "no message unread"),
                () -> assertEquals(1, list.items().size(), "one row"),
                () -> assertEquals("application_received", item.type(), "wire type"),
                () -> assertEquals(actor.id(), item.actor().id(), "actor is the applicant"),
                () -> assertEquals(trip.id(), item.tripId(), "trip id"),
                () -> assertEquals(trip.title(), item.tripTitle(), "trip title"),
                () -> assertEquals(41L, item.applicationId(), "application id"),
                () -> assertFalse(item.read(), "new row is unread"),
                () -> assertTrue(
                        item.text().contains(actor.nickname()) && item.text().contains(trip.title()),
                        "text embeds actor nickname and trip title"));
    }

    @Test
    void in_messageEvent_out_messageCountAndPayload() {
        // Given
        ChatMessage message = new ChatMessage(
                55L, trip.id(), actor.id(), recipient.id(), "在吗", clock.instant());

        // When
        notificationService.notifyMessage(recipient.id(), actor.id(), message);

        // Then
        NotificationListResponse list = notificationService.list(recipient.id());
        NotificationResponse item = list.items().getFirst();
        assertAll(
                () -> assertEquals(1, list.counts().total(), "total unread"),
                () -> assertEquals(0, list.counts().application(), "no application unread"),
                () -> assertEquals(1, list.counts().message(), "message unread"),
                () -> assertEquals(NotificationTypeEnum.MESSAGE.wireValue(), item.type(), "wire type"),
                () -> assertEquals(55L, item.messageId(), "message id"),
                () -> assertEquals(actor.id(), item.actor().id(), "actor is the sender"),
                () -> assertEquals(null, item.applicationId(), "no application id"));
    }

    @Test
    void in_markOne_out_totalMinusOneAndIdempotent() {
        // Given
        notificationService.notifyApplicationReceived(recipient.id(), actor.id(), trip.id(), 41L);
        notificationService.notifyApplicationReceived(recipient.id(), actor.id(), trip.id(), 42L);
        long firstId = notificationService.list(recipient.id()).items().getLast().id();

        // When
        NotificationCountsResponse first = notificationService.markRead(firstId, recipient.id());
        NotificationCountsResponse second = notificationService.markRead(firstId, recipient.id());

        // Then
        assertAll(
                () -> assertEquals(1, first.total(), "reading one decrements exactly one"),
                () -> assertEquals(1, second.total(), "repeated mark-read keeps the count"),
                () -> assertTrue(
                        notificationService.list(recipient.id()).items().stream()
                                .filter(item -> item.id() == firstId)
                                .allMatch(NotificationResponse::read),
                        "row is marked read"));
    }

    @Test
    void in_markAll_out_zero() {
        // Given
        notificationService.notifyApplicationReceived(recipient.id(), actor.id(), trip.id(), 41L);
        notificationService.notifyMessage(
                recipient.id(), actor.id(),
                new ChatMessage(55L, trip.id(), actor.id(), recipient.id(), "在吗", clock.instant()));

        // When
        NotificationCountsResponse counts = notificationService.markAllRead(recipient.id());

        // Then
        NotificationListResponse list = notificationService.list(recipient.id());
        assertAll(
                () -> assertEquals(0, counts.total(), "all read"),
                () -> assertEquals(0, list.counts().total(), "list counts agree"),
                () -> assertTrue(list.items().stream().allMatch(NotificationResponse::read), "items are read"));
    }

    @Test
    void in_markConversation_out_onlyThatConversation() {
        // Given: two conversations plus one application notification
        DemoUser otherActor = demoUserService.findAll().get(2);
        notificationService.notifyMessage(
                recipient.id(), actor.id(),
                new ChatMessage(55L, trip.id(), actor.id(), recipient.id(), "一", clock.instant()));
        notificationService.notifyMessage(
                recipient.id(), otherActor.id(),
                new ChatMessage(56L, trip.id(), otherActor.id(), recipient.id(), "二", clock.instant()));
        notificationService.notifyApplicationReceived(recipient.id(), actor.id(), trip.id(), 41L);

        // When
        NotificationCountsResponse counts =
                notificationService.markConversationRead(recipient.id(), trip.id(), actor.id());

        // Then
        assertAll(
                () -> assertEquals(2, counts.total(), "application and the other conversation stay unread"),
                () -> assertEquals(1, counts.application(), "application notifications are untouched"),
                () -> assertEquals(1, counts.message(), "only the other conversation stays unread"));
    }

    @Test
    void in_notificationOfOtherUser_out_notFound() {
        // Given
        notificationService.notifyApplicationReceived(recipient.id(), actor.id(), trip.id(), 41L);
        long id = notificationService.list(recipient.id()).items().getFirst().id();

        // When
        NotificationNotFoundException rejection = assertThrows(
                NotificationNotFoundException.class,
                () -> notificationService.markRead(id, actor.id()));

        // Then
        assertAll(
                () -> assertEquals("NOTIFICATION_NOT_FOUND", rejection.code()),
                () -> assertEquals(1, notificationService.list(recipient.id()).counts().total(), "owner count unchanged"),
                () -> assertEquals(0, notificationService.list(actor.id()).counts().total(), "other user sees nothing"));
    }

    @Test
    void in_51Notifications_out_latest50Ordered() {
        // Given
        for (long index = 1; index <= 51; index++) {
            notificationService.notifyMessage(
                    recipient.id(), actor.id(),
                    new ChatMessage(index, trip.id(), actor.id(), recipient.id(), "m" + index, clock.instant()));
        }
        long newestId = notificationService.list(recipient.id()).items().getFirst().id();

        // When
        List<NotificationResponse> items = notificationService.list(recipient.id()).items();

        // Then
        assertAll(
                () -> assertEquals(50, items.size(), "list is capped at 50"),
                () -> assertEquals(newestId, items.getFirst().id(), "newest first"),
                () -> assertEquals(51, notificationService.list(recipient.id()).counts().total(),
                        "counts are not truncated by the list cap"),
                () -> assertTrue(
                        items.get(0).createdAt().compareTo(items.getLast().createdAt()) >= 0,
                        "created_at descending"));
    }

    @Test
    void in_notificationsForRecipient_out_otherRecipientsUnaffected() {
        // Given
        DemoUser observer = demoUserService.findAll().get(2);

        // When
        notificationService.notifyApplicationReceived(recipient.id(), actor.id(), trip.id(), 41L);

        // Then
        assertAll(
                () -> assertEquals(1, notificationService.list(recipient.id()).counts().total(), "owner"),
                () -> assertEquals(0, notificationService.list(observer.id()).counts().total(), "observer"));
    }
}