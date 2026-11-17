package routeme.controller;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import routeme.config.FixedClockTestConfig;
import routeme.pojo.ChatMessage;
import routeme.pojo.DemoUser;
import routeme.pojo.TripPlan;
import routeme.service.DemoUserService;
import routeme.service.NotificationService;
import routeme.service.TripPlanService;

/**
 * 通知接口契约：列表 / 标读 / 流端点的状态码与响应头。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(FixedClockTestConfig.class)
class NotificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private DemoUserService demoUserService;

    @Autowired
    private TripPlanService tripPlanService;

    @Autowired
    private Clock clock;

    private DemoUser reader;
    private DemoUser actor;
    private DemoUser other;
    private TripPlan trip;

    @BeforeEach
    void setUp() {
        List<DemoUser> users = demoUserService.findAll();
        reader = users.get(0);
        actor = users.get(1);
        other = users.get(2);
        trip = tripPlanService.findAllTrips().getFirst();
    }

    @Test
    void in_list_out_latestItemsAndCounts() throws Exception {
        // Given: 2 application + 3 message notifications
        notificationService.notifyApplicationReceived(reader.id(), actor.id(), trip.id(), 41L);
        notificationService.notifyApplicationReceived(reader.id(), actor.id(), trip.id(), 42L);
        for (long index = 1; index <= 3; index++) {
            notificationService.notifyMessage(
                    reader.id(), actor.id(),
                    new ChatMessage(index, trip.id(), actor.id(), reader.id(), "m" + index, clock.instant()));
        }

        // When / Then
        mockMvc.perform(get("/api/notifications").header("X-User-Id", reader.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(5)))
                .andExpect(jsonPath("$.counts.total").value(5))
                .andExpect(jsonPath("$.counts.application").value(2))
                .andExpect(jsonPath("$.counts.message").value(3))
                .andExpect(jsonPath("$.counts.total", greaterThanOrEqualTo(0)))
                .andExpect(jsonPath("$.items[0].type").value("message"))
                .andExpect(jsonPath("$.items[0].read").value(false));
    }

    @Test
    void in_missingHeader_out_unauthorized() throws Exception {
        mockMvc.perform(get("/api/notifications"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("DEMO_USER_REQUIRED"));
    }

    @Test
    void in_markOne_out_reducedCountsAndIdempotent() throws Exception {
        // Given
        notificationService.notifyApplicationReceived(reader.id(), actor.id(), trip.id(), 41L);
        notificationService.notifyApplicationReceived(reader.id(), actor.id(), trip.id(), 42L);
        long oldestId = notificationService.list(reader.id()).items().getLast().id();

        // When / Then
        mockMvc.perform(post("/api/notifications/" + oldestId + "/read").header("X-User-Id", reader.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1));
        mockMvc.perform(post("/api/notifications/" + oldestId + "/read").header("X-User-Id", reader.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1));
    }

    @Test
    void in_readNotificationOfSomeoneElse_out_notFound() throws Exception {
        // Given
        notificationService.notifyApplicationReceived(reader.id(), actor.id(), trip.id(), 41L);
        long id = notificationService.list(reader.id()).items().getFirst().id();

        // When / Then
        mockMvc.perform(post("/api/notifications/" + id + "/read").header("X-User-Id", other.id()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOTIFICATION_NOT_FOUND"));
        mockMvc.perform(post("/api/notifications/999999/read").header("X-User-Id", reader.id()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOTIFICATION_NOT_FOUND"));
    }

    @Test
    void in_markAll_out_zero() throws Exception {
        // Given
        notificationService.notifyApplicationReceived(reader.id(), actor.id(), trip.id(), 41L);
        notificationService.notifyMessage(
                reader.id(), actor.id(),
                new ChatMessage(55L, trip.id(), actor.id(), reader.id(), "hi", clock.instant()));

        // When / Then
        mockMvc.perform(post("/api/notifications/read")
                        .header("X-User-Id", reader.id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"scope\":\"all\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void in_markConversation_out_onlyThatConversation() throws Exception {
        // Given: two conversations plus one application notification
        notificationService.notifyMessage(
                reader.id(), actor.id(),
                new ChatMessage(55L, trip.id(), actor.id(), reader.id(), "一", clock.instant()));
        notificationService.notifyMessage(
                reader.id(), other.id(),
                new ChatMessage(56L, trip.id(), other.id(), reader.id(), "二", clock.instant()));
        notificationService.notifyApplicationReceived(reader.id(), actor.id(), trip.id(), 41L);

        // When / Then
        mockMvc.perform(post("/api/notifications/read")
                        .header("X-User-Id", reader.id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"scope\":\"conversation\",\"trip_id\":" + trip.id()
                                + ",\"other_user_id\":" + actor.id() + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.application").value(1))
                .andExpect(jsonPath("$.message").value(1));
    }

    @Test
    void in_invalidScope_out_badRequest() throws Exception {
        mockMvc.perform(post("/api/notifications/read")
                        .header("X-User-Id", reader.id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"scope\":\"bogus\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        mockMvc.perform(post("/api/notifications/read")
                        .header("X-User-Id", reader.id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"scope\":\"conversation\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_stream_out_sseHeaders() throws Exception {
        // When
        MvcResult result = mockMvc.perform(
                        get("/api/notifications/stream").param("user_id", String.valueOf(reader.id())))
                .andExpect(status().isOk())
                .andExpect(request().asyncStarted())
                .andReturn();

        // Then
        String contentType = result.getResponse().getContentType();
        assertTrue(contentType != null && contentType.startsWith("text/event-stream"), "content type");
        assertEquals("no-cache", result.getResponse().getHeader("Cache-Control"), "cache control");
        assertEquals("no", result.getResponse().getHeader("X-Accel-Buffering"), "no proxy buffering");

        result.getRequest().getAsyncContext().complete();
    }

    @Test
    void in_streamWithoutUserId_out_unauthorized() throws Exception {
        mockMvc.perform(get("/api/notifications/stream"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("DEMO_USER_REQUIRED"));
    }
}