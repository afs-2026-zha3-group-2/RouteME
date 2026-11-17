package routeme.controller;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import routeme.exception.InvalidInputException;
import routeme.pojo.DemoUser;
import routeme.request.NotificationReadRequest;
import routeme.response.NotificationCountsResponse;
import routeme.response.NotificationListResponse;
import routeme.service.DemoUserService;
import routeme.service.NotificationService;
import routeme.service.NotificationStreamService;

/**
 * 通知接口：列表、单条 / 全部 / 单会话标读与 SSE 通道。
 */
@RestController
@RequestMapping("/api")
public class NotificationController {

    private final DemoUserService demoUserService;
    private final NotificationService notificationService;
    private final NotificationStreamService streamService;

    public NotificationController(
            DemoUserService demoUserService,
            NotificationService notificationService,
            NotificationStreamService streamService) {
        this.demoUserService = demoUserService;
        this.notificationService = notificationService;
        this.streamService = streamService;
    }

    @GetMapping("/notifications")
    public NotificationListResponse list(
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        DemoUser reader = demoUserService.require(userId);
        return notificationService.list(reader.id());
    }

    @GetMapping("/notifications/stream")
    public ResponseEntity<SseEmitter> stream(
            @RequestParam(name = "user_id", required = false) Long userId) {
        DemoUser reader = demoUserService.require(userId);
        SseEmitter emitter = new SseEmitter(0L);
        streamService.connect(reader.id(), emitter);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache())
                .header("X-Accel-Buffering", "no")
                .contentType(MediaType.TEXT_EVENT_STREAM)
                .body(emitter);
    }

    @PostMapping("/notifications/{notificationId}/read")
    public NotificationCountsResponse readOne(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable long notificationId) {
        DemoUser reader = demoUserService.require(userId);
        return notificationService.markRead(notificationId, reader.id());
    }

    @PostMapping("/notifications/read")
    public NotificationCountsResponse readScoped(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestBody(required = false) NotificationReadRequest request) {
        DemoUser reader = demoUserService.require(userId);
        if (request == null || request.scope() == null) {
            throw new InvalidInputException("scope is required");
        }
        return switch (request.scope()) {
            case "all" -> notificationService.markAllRead(reader.id());
            case "conversation" -> {
                if (request.tripId() == null || request.otherUserId() == null) {
                    throw new InvalidInputException(
                            "trip_id and other_user_id are required for scope=conversation");
                }
                yield notificationService.markConversationRead(
                        reader.id(), request.tripId(), request.otherUserId());
            }
            default -> throw new InvalidInputException("unsupported scope: " + request.scope());
        };
    }
}