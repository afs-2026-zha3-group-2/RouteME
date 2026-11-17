package routeme.service;

import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import routeme.response.NotificationEventResponse;

/**
 * 通知推送通道：内存注册表 + SSE 投递。
 *
 * <p>没有数据库表，因此不继承 {@code IService}；与 {@code WeatherService} 同构。</p>
 */
public interface NotificationStreamService {

    /**
     * 注册一个连接；同一用户可同时有多个标签页。
     *
     * @param userId  订阅者 id
     * @param emitter 由控制器创建的 SSE 连接
     */
    void connect(long userId, SseEmitter emitter);

    /**
     * 向该用户的全部连接投递一个事件；单个连接失败只移除该连接，不向上抛。
     *
     * @param userId 收件人 id
     * @param event  通知与可选的聊天消息
     */
    void publish(long userId, NotificationEventResponse event);
}