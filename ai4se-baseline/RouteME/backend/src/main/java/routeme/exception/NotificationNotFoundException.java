package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * 通知不存在或不属于当前用户；不暴露他人通知的存在性。
 */
public class NotificationNotFoundException extends BusinessException {

    public NotificationNotFoundException(long notificationId) {
        super("NOTIFICATION_NOT_FOUND", HttpStatus.NOT_FOUND, "notification not found: " + notificationId);
    }
}