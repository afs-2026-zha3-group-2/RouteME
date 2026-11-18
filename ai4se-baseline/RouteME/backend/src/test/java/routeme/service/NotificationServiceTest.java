package routeme.service;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import routeme.enums.NotificationPriorityEnum;
import routeme.enums.NotificationStatusEnum;
import routeme.exception.NotificationNotFoundException;
import routeme.pojo.ChatMessage;
import routeme.pojo.DemoUser;
import routeme.pojo.TripPlan;
import routeme.response.NotificationCountsResponse;
import routeme.response.NotificationListResponse;
import routeme.response.NotificationResponse;

/**
 * 通知写入、列表、按八类计数与三种标读范围。
 *
 * <p>迁移种子里的过期行程会在首次读取时补发完成通知，因此计数一律按「本用例新增行」断言，
 * 不依赖库里的初始行数。</p>
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
    private NotificationCountsResponse recipientBaseline;
    private NotificationCountsResponse actorBaseline;
    private Set<Long> recipientBaselineIds;

    @BeforeEach
    void setUp() {
        List<DemoUser> users = demoUserService.findAll();
        recipient = users.get(0);
        actor = users.get(1);
        trip = tripPlanService.findAllTrips().get(0);
        NotificationListResponse initial = notificationService.list(recipient.id());
        recipientBaseline = initial.counts();
        recipientBaselineIds = new HashSet<>(initial.items().stream()
                .map(NotificationResponse::id)
                .toList());
        actorBaseline = notificationService.list(actor.id()).counts();
    }

    private long countOf(NotificationCountsResponse counts, String type) {
        return counts.byType().get(type);
    }

    private List<NotificationResponse> newItems() {
        return notificationService.list(recipient.id()).items().stream()
                .filter(item -> !recipientBaselineIds.contains(item.id()))
                .toList();
    }

    private long newTotal() {
        return notificationService.list(recipient.id()).counts().total() - recipientBaseline.total();
    }

    @Test
    void in_applicationEvent_out_rowCountsAndTarget() {
        // When
        notificationService.notifyApplicationReceived(
                recipient.id(), actor.id(), trip.id(), 41L);

        // Then
        NotificationListResponse list = notificationService.list(recipient.id());
        NotificationCountsResponse counts = list.counts();
        List<NotificationResponse> created = newItems();
        NotificationResponse item = created.getFirst();
        assertAll(
                () -> assertEquals(1, newTotal(), "one new unread"),
                () -> assertEquals(
                        countOf(recipientBaseline, "APPLICATION") + 1,
                        countOf(counts, "APPLICATION"),
                        "application unread"),
                () -> assertEquals(
                        countOf(recipientBaseline, "CHAT"), countOf(counts, "CHAT"), "no chat unread"),
                () -> assertEquals(8, counts.byType().size(), "all eight type counters are present"),
                () -> assertEquals(1, created.size(), "one row"),
                () -> assertEquals("APPLICATION", item.type(), "type"),
                () -> assertEquals("application_received", item.event(), "event"),
                () -> assertEquals(NotificationStatusEnum.UNREAD.wireValue(), item.status(), "status"),
                () -> assertEquals(NotificationPriorityEnum.NORMAL.wireValue(), item.priority(), "priority"),
                () -> assertEquals(actor.id(), item.actor().id(), "actor is the applicant"),
                () -> assertEquals(trip.id(), item.tripId(), "trip id"),
                () -> assertEquals(trip.title(), item.tripTitle(), "trip title"),
                () -> assertEquals(41L, item.applicationId(), "application id"),
                () -> assertNull(item.readAt(), "new row has no read time"),
                () -> assertEquals("applications", item.target().kind(), "received applications jump to handling"),
                () -> assertEquals(trip.id(), item.target().tripId(), "target trip"),
                () -> assertTrue(item.relatedAvailable(), "trip still exists"),
                () -> assertTrue(item.title().contains("申请"), "title generated"),
                () -> assertTrue(
                        item.content().contains(actor.nickname()) && item.content().contains(trip.title()),
                        "content embeds actor nickname and trip title"));
    }

    @Test
    void in_messageEvent_out_chatCountAndTarget() {
        // Given
        ChatMessage message = new ChatMessage(
                55L, trip.id(), actor.id(), recipient.id(), "在吗", clock.instant());

        // When
        notificationService.notifyMessage(recipient.id(), actor.id(), message);

        // Then
        NotificationListResponse list = notificationService.list(recipient.id());
        NotificationResponse item = newItems().getFirst();
        assertAll(
                () -> assertEquals(1, newTotal(), "one new unread"),
                () -> assertEquals(
                        countOf(recipientBaseline, "APPLICATION"),
                        countOf(list.counts(), "APPLICATION"),
                        "no application unread"),
                () -> assertEquals(
                        countOf(recipientBaseline, "CHAT") + 1, countOf(list.counts(), "CHAT"), "chat unread"),
                () -> assertEquals("CHAT", item.type(), "type"),
                () -> assertEquals("message", item.event(), "event"),
                () -> assertEquals(55L, item.messageId(), "message id"),
                () -> assertEquals(actor.id(), item.actor().id(), "actor is the sender"),
                () -> assertNull(item.applicationId(), "no application id"),
                () -> assertEquals("chat", item.target().kind(), "chat target"),
                () -> assertEquals(actor.id(), item.target().otherUserId(), "conversation partner"));
    }

    @Test
    void in_tripAndCreditEvents_out_targetsAndPriority() {
        // When
        notificationService.notifyTripFull(recipient.id(), actor.id(), trip.id());
        notificationService.notifyCreditChanged(recipient.id(), 70, 55, 900L, "EXIT_DURING_TRIP");

        // Then
        List<NotificationResponse> created = newItems();
        NotificationResponse tripItem = created.stream()
                .filter(item -> "TRIP".equals(item.type()))
                .findFirst()
                .orElseThrow();
        NotificationResponse creditItem = created.stream()
                .filter(item -> "CREDIT".equals(item.type()))
                .findFirst()
                .orElseThrow();
        assertAll(
                () -> assertEquals("trip_full", tripItem.event(), "trip event"),
                () -> assertEquals("trip", tripItem.target().kind(), "trip target"),
                () -> assertEquals(trip.id(), tripItem.target().tripId(), "trip id"),
                () -> assertEquals("credit", creditItem.target().kind(), "credit target"),
                () -> assertEquals("HIGH", creditItem.priority(), "score below 60 is high priority"),
                () -> assertTrue(creditItem.content().contains("55"), "resulting score in content"),
                () -> assertTrue(creditItem.relatedAvailable(), "credit records are always reachable"));
    }

    @Test
    void in_sameBusinessEventTwice_out_oneRow() {
        // When
        notificationService.notifyApplicationReceived(recipient.id(), actor.id(), trip.id(), 41L);
        notificationService.notifyApplicationReceived(recipient.id(), actor.id(), trip.id(), 41L);

        // Then
        assertAll(
                () -> assertEquals(1, newItems().size(), "deduplicated"),
                () -> assertEquals(1, newTotal(), "one unread"));
    }

    @Test
    void in_markOne_out_totalMinusOneAndIdempotent() {
        // Given
        notificationService.notifyApplicationReceived(recipient.id(), actor.id(), trip.id(), 41L);
        notificationService.notifyApplicationReceived(recipient.id(), actor.id(), trip.id(), 42L);
        long firstId = newItems().getLast().id();

        // When
        NotificationCountsResponse first = notificationService.markRead(firstId, recipient.id());
        NotificationCountsResponse second = notificationService.markRead(firstId, recipient.id());

        // Then
        assertAll(
                () -> assertEquals(1, first.total() - recipientBaseline.total(), "reading one decrements exactly one"),
                () -> assertEquals(1, second.total() - recipientBaseline.total(), "repeated mark-read keeps the count"),
                () -> assertTrue(
                        notificationService.list(recipient.id()).items().stream()
                                .filter(item -> item.id() == firstId)
                                .allMatch(item -> item.status().equals(NotificationStatusEnum.READ.wireValue())),
                        "row is marked READ"),
                () -> assertFalse(
                        notificationService.list(recipient.id()).items().stream()
                                .filter(item -> item.id() == firstId)
                                .allMatch(item -> item.readAt() == null),
                        "read time is stored"));
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
                () -> assertTrue(
                        list.items().stream()
                                .allMatch(item -> item.status().equals(NotificationStatusEnum.READ.wireValue())),
                        "items are READ"));
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
                () -> assertEquals(2, counts.total() - recipientBaseline.total(),
                        "application and the other conversation stay unread"),
                () -> assertEquals(
                        countOf(recipientBaseline, "APPLICATION") + 1,
                        countOf(counts, "APPLICATION"),
                        "application notifications are untouched"),
                () -> assertEquals(
                        countOf(recipientBaseline, "CHAT") + 1,
                        countOf(counts, "CHAT"),
                        "only the other conversation stays unread"));
    }

    @Test
    void in_notificationOfOtherUser_out_notFound() {
        // Given
        notificationService.notifyApplicationReceived(recipient.id(), actor.id(), trip.id(), 41L);
        long id = newItems().getFirst().id();

        // When
        NotificationNotFoundException rejection = assertThrows(
                NotificationNotFoundException.class,
                () -> notificationService.markRead(id, actor.id()));

        // Then
        assertAll(
                () -> assertEquals("NOTIFICATION_NOT_FOUND", rejection.code()),
                () -> assertEquals(1, newTotal(), "owner count unchanged"),
                () -> assertEquals(
                        actorBaseline.total(),
                        notificationService.list(actor.id()).counts().total(),
                        "other user sees nothing"));
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
                () -> assertEquals(51, newTotal(), "counts are not truncated by the list cap"),
                () -> assertNotNull(items.getFirst().createdAt(), "created time present"),
                () -> assertTrue(
                        items.get(0).createdAt().compareTo(items.getLast().createdAt()) >= 0,
                        "created_at descending"));
    }

    @Test
    void in_notificationsForRecipient_out_otherRecipientsUnaffected() {
        // Given
        DemoUser observer = demoUserService.findAll().get(2);
        long observerBaseline = notificationService.list(observer.id()).counts().total();

        // When
        notificationService.notifyApplicationReceived(recipient.id(), actor.id(), trip.id(), 41L);

        // Then
        assertAll(
                () -> assertEquals(1, newTotal(), "owner"),
                () -> assertEquals(
                        observerBaseline,
                        notificationService.list(observer.id()).counts().total(),
                        "observer"));
    }
}