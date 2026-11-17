package routeme.response;

import java.time.Instant;

import routeme.pojo.Notification;
import routeme.pojo.DemoUser;
import routeme.pojo.TripPlan;
import routeme.utils.NotificationTextUtils;

/**
 * 通知列表条目。{@code text} 由后端生成，前端直接展示。
 */
public record NotificationResponse(
        long id,
        String type,
        DemoUserResponse actor,
        long tripId,
        String tripTitle,
        Long applicationId,
        Long messageId,
        String text,
        Instant createdAt,
        boolean read) {

    public static NotificationResponse from(
            Notification notification, DemoUser actor, TripPlan trip) {
        return new NotificationResponse(
                notification.id(),
                notification.type().wireValue(),
                DemoUserResponse.from(actor),
                notification.tripId(),
                trip.title(),
                notification.applicationId(),
                notification.messageId(),
                NotificationTextUtils.text(
                        notification.type().wireValue(), actor.nickname(), trip.title()),
                notification.createdAt(),
                notification.read());
    }
}