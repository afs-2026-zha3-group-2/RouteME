package routeme.response;

import java.time.Instant;

import routeme.pojo.DemoUser;
import routeme.pojo.Notification;

/**
 * 通知列表条目。{@code title} / {@code content} 由后端生成，前端直接展示。
 *
 * @param relatedAvailable 关联业务当前是否仍可访问；false 时前端提示「相关内容当前不可查看」
 */
public record NotificationResponse(
        long id,
        String type,
        String event,
        String title,
        String content,
        String priority,
        String status,
        Instant createdAt,
        Instant readAt,
        DemoUserResponse actor,
        Long tripId,
        String tripTitle,
        Long applicationId,
        Long messageId,
        Long reportId,
        Long sessionId,
        NotificationTargetResponse target,
        boolean relatedAvailable) {

    public static NotificationResponse from(
            Notification notification,
            DemoUser actor,
            String tripTitle,
            NotificationTargetResponse target,
            boolean relatedAvailable) {
        return new NotificationResponse(
                notification.id(),
                notification.type().wireValue(),
                notification.event(),
                notification.title(),
                notification.content(),
                notification.priority().wireValue(),
                notification.status().wireValue(),
                notification.createdAt(),
                notification.readAt(),
                actor == null ? null : DemoUserResponse.from(actor),
                notification.tripId(),
                tripTitle,
                notification.applicationId(),
                notification.messageId(),
                notification.reportId(),
                notification.sessionId(),
                target,
                relatedAvailable);
    }
}