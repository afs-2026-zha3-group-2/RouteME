package routeme.service.impl;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import routeme.response.NotificationEventResponse;

/**
 * 流服务注册表：按用户分桶、单连接失败隔离、心跳与清理。
 */
class NotificationStreamServiceTest {

    private NotificationStreamServiceImpl streamService;

    @BeforeEach
    void setUp() {
        streamService = new NotificationStreamServiceImpl();
        streamService.startHeartbeat();
    }

    @AfterEach
    void tearDown() {
        streamService.stopHeartbeat();
    }

    @Test
    void in_twoUsers_out_publishOnlyReachesTarget() {
        // Given
        RecordingEmitter first = new RecordingEmitter();
        RecordingEmitter second = new RecordingEmitter();
        RecordingEmitter other = new RecordingEmitter();
        streamService.connect(1L, first);
        streamService.connect(1L, second);
        streamService.connect(2L, other);

        // When
        streamService.publish(1L, event());

        // Then
        assertAll(
                () -> assertEquals(1, first.events.size(), "first tab of user 1 receives"),
                () -> assertEquals(1, second.events.size(), "second tab of user 1 receives"),
                () -> assertEquals(0, other.events.size(), "user 2 receives nothing"));
    }

    @Test
    void in_failingEmitter_out_removedWithoutAffectingOthers() {
        // Given
        RecordingEmitter failing = new RecordingEmitter();
        failing.failNext = true;
        RecordingEmitter healthy = new RecordingEmitter();
        streamService.connect(1L, failing);
        streamService.connect(1L, healthy);

        // When
        streamService.publish(1L, event());

        // Then
        streamService.publish(1L, event());
        assertAll(
                () -> assertEquals(0, failing.events.size(), "failed send is not recorded"),
                () -> assertEquals(2, healthy.events.size(), "healthy emitter keeps receiving"));
    }

    @Test
    void in_heartbeat_out_pingWithoutFailure() {
        // Given
        RecordingEmitter emitter = new RecordingEmitter();
        streamService.connect(1L, emitter);

        // When
        streamService.heartbeat();

        // Then
        assertEquals(1, emitter.events.size(), "heartbeat sends one comment");
    }

    private NotificationEventResponse event() {
        return new NotificationEventResponse(null, null);
    }

    private static final class RecordingEmitter extends SseEmitter {

        private final List<SseEventBuilder> events = new CopyOnWriteArrayList<>();
        private boolean failNext;

        @Override
        public void send(SseEventBuilder builder) throws IOException {
            if (failNext) {
                failNext = false;
                throw new IOException("client gone");
            }
            events.add(builder);
        }

        @Override
        public void send(Object object) throws IOException {
            events.add(null);
        }

        @Override
        public void send(Object object, MediaType mediaType) throws IOException {
            events.add(null);
        }
    }
}