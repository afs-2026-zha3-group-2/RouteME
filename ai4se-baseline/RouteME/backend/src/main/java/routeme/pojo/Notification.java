package routeme.pojo;

import java.time.Instant;

import routeme.enums.NotificationTypeEnum;

/**
 * 通知领域对象；一个投递事件一行。
 *
 * @param id            通知 id
 * @param recipientId   收件人
 * @param type          事件类型
 * @param actorId       动作人（申请者 / 裁决者 / 消息发送方）
 * @param tripId        关联行程
 * @param applicationId 申请类关联的申请，消息类为 null
 * @param messageId     消息类关联的消息，申请类为 null
 * @param createdAt     创建时刻
 * @param readAt        已读时刻；null 表示未读
 */
public record Notification(
        Long id,
        Long recipientId,
        NotificationTypeEnum type,
        Long actorId,
        Long tripId,
        Long applicationId,
        Long messageId,
        Instant createdAt,
        Instant readAt) {

    public boolean read() {
        return readAt != null;
    }
}