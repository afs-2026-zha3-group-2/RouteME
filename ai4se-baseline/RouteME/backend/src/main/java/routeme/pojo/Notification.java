package routeme.pojo;

import java.time.Instant;

import routeme.enums.NotificationPriorityEnum;
import routeme.enums.NotificationStatusEnum;
import routeme.enums.NotificationTypeEnum;

/**
 * 通知领域对象；一个业务事件一行。
 *
 * @param id            通知 id
 * @param recipientId   收件人
 * @param type          业务域类型（TRIP / APPLICATION / CHAT / CREDIT / REPORT / ACCOUNT / SERVICE / SYSTEM）
 * @param event         具体事件 wire 值（如 {@code trip_cancelled}）
 * @param title         标题（后端生成，前端直接展示）
 * @param content       正文（后端生成，含取消原因 / 分数变化等业务事实）
 * @param priority      优先级；信用分低于 60 等事件为 HIGH
 * @param actorId       动作人；系统 / 信用 / 客服 / 认证类通知为 null
 * @param tripId        关联行程；无则 null
 * @param applicationId 关联同行申请；无则 null
 * @param messageId     关联聊天消息；无则 null
 * @param reportId      关联举报；无则 null
 * @param sessionId     关联客服会话；无则 null
 * @param dedupeKey     去重键；同一收件人下唯一
 * @param createdAt     创建时刻
 * @param readAt        已读时刻；null 表示未读
 */
public record Notification(
        Long id,
        long recipientId,
        NotificationTypeEnum type,
        String event,
        String title,
        String content,
        NotificationPriorityEnum priority,
        Long actorId,
        Long tripId,
        Long applicationId,
        Long messageId,
        Long reportId,
        Long sessionId,
        String dedupeKey,
        Instant createdAt,
        Instant readAt) {

    public boolean read() {
        return readAt != null;
    }

    public NotificationStatusEnum status() {
        return read() ? NotificationStatusEnum.READ : NotificationStatusEnum.UNREAD;
    }
}