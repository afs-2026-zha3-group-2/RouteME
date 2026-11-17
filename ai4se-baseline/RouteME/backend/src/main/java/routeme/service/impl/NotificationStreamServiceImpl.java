package routeme.service.impl;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;

import routeme.response.NotificationEventResponse;
import routeme.service.NotificationStreamService;

/**
 * SSE 注册表：按用户分桶，单连接失败只移除该连接；心跳约 20 秒一次。
 *
 * <p>推送发生在业务事务提交之后（由 {@code NotificationServiceImpl} 注册 afterCommit），
 * 因此客户端收到事件时通知行已持久化。</p>
 */
@Slf4j
@Service
public class NotificationStreamServiceImpl implements NotificationStreamService {

    private static final long HEARTBEAT_SECONDS = 20;

    private final Map<Long, Set<SseEmitter>> emitters = new ConcurrentHashMap<>();

    private ScheduledExecutorService heartbeatExecutor;

    @PostConstruct
    public void startHeartbeat() {
        if (heartbeatExecutor != null) {
            return;
        }
        heartbeatExecutor = Executors.newSingleThreadScheduledExecutor(runnable -> {
            Thread thread = new Thread(runnable, "notification-heartbeat");
            thread.setDaemon(true);
            return thread;
        });
        heartbeatExecutor.scheduleAtFixedRate(
                this::heartbeat, HEARTBEAT_SECONDS, HEARTBEAT_SECONDS, TimeUnit.SECONDS);
    }

    @PreDestroy
    public void stopHeartbeat() {
        if (heartbeatExecutor == null) {
            return;
        }
        heartbeatExecutor.shutdownNow();
        heartbeatExecutor = null;
        emitters.values().forEach(targets -> targets.forEach(SseEmitter::complete));
        emitters.clear();
    }

    @Override
    public void connect(long userId, SseEmitter emitter) {
        emitters.computeIfAbsent(userId, key -> ConcurrentHashMap.newKeySet()).add(emitter);
        emitter.onCompletion(() -> remove(userId, emitter));
        emitter.onTimeout(() -> {
            remove(userId, emitter);
            emitter.complete();
        });
        emitter.onError(error -> remove(userId, emitter));
    }

    @Override
    public void publish(long userId, NotificationEventResponse event) {
        Set<SseEmitter> targets = emitters.get(userId);
        if (targets == null) {
            return;
        }
        for (SseEmitter emitter : targets) {
            try {
                synchronized (emitter) {
                    emitter.send(SseEmitter.event()
                            .name("notification")
                            .data(event, MediaType.APPLICATION_JSON));
                }
            } catch (Exception exception) {
                remove(userId, emitter);
                emitter.complete();
            }
        }
    }

    /**
     * 心跳：SSE 注释行 {@code : ping}；失败连接立即清理。
     */
    void heartbeat() {
        emitters.forEach((userId, targets) -> {
            for (SseEmitter emitter : targets) {
                try {
                    synchronized (emitter) {
                        emitter.send(SseEmitter.event().comment("ping"));
                    }
                } catch (Exception exception) {
                    remove(userId, emitter);
                }
            }
        });
    }

    private void remove(long userId, SseEmitter emitter) {
        Set<SseEmitter> targets = emitters.get(userId);
        if (targets == null) {
            return;
        }
        targets.remove(emitter);
        if (targets.isEmpty()) {
            emitters.remove(userId, targets);
        }
    }
}