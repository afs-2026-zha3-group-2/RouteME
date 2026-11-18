package routeme.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.Instant;

import routeme.enums.NotificationPriorityEnum;
import routeme.enums.NotificationTypeEnum;
import routeme.pojo.Notification;

/**
 * notifications 行对象。
 *
 * <p>时间与既有实体一致，存 ISO-8601 字符串，字典序即时间序。</p>
 */
@TableName("notifications")
public class NotificationEntity {

    @TableId(type = IdType.INPUT)
    private Long id;

    private Long recipientId;

    private String type;

    private String event;

    private String title;

    private String content;

    private String priority;

    private Long actorId;

    private Long tripId;

    private Long applicationId;

    private Long messageId;

    private Long reportId;

    private Long sessionId;

    private String dedupeKey;

    private String createdAt;

    private String readAt;

    public static NotificationEntity from(Notification notification) {
        NotificationEntity entity = new NotificationEntity();
        entity.setId(notification.id());
        entity.setRecipientId(notification.recipientId());
        entity.setType(notification.type().wireValue());
        entity.setEvent(notification.event());
        entity.setTitle(notification.title());
        entity.setContent(notification.content());
        entity.setPriority(notification.priority().wireValue());
        entity.setActorId(notification.actorId());
        entity.setTripId(notification.tripId());
        entity.setApplicationId(notification.applicationId());
        entity.setMessageId(notification.messageId());
        entity.setReportId(notification.reportId());
        entity.setSessionId(notification.sessionId());
        entity.setDedupeKey(notification.dedupeKey());
        entity.setCreatedAt(notification.createdAt().toString());
        entity.setReadAt(notification.readAt() == null ? null : notification.readAt().toString());
        return entity;
    }

    public Notification toNotification() {
        return new Notification(
                id,
                recipientId,
                NotificationTypeEnum.fromWire(type),
                event,
                title,
                content,
                NotificationPriorityEnum.valueOf(priority),
                actorId,
                tripId,
                applicationId,
                messageId,
                reportId,
                sessionId,
                dedupeKey,
                Instant.parse(createdAt),
                readAt == null ? null : Instant.parse(readAt));
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getRecipientId() {
        return recipientId;
    }

    public void setRecipientId(Long recipientId) {
        this.recipientId = recipientId;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getEvent() {
        return event;
    }

    public void setEvent(String event) {
        this.event = event;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public Long getActorId() {
        return actorId;
    }

    public void setActorId(Long actorId) {
        this.actorId = actorId;
    }

    public Long getTripId() {
        return tripId;
    }

    public void setTripId(Long tripId) {
        this.tripId = tripId;
    }

    public Long getApplicationId() {
        return applicationId;
    }

    public void setApplicationId(Long applicationId) {
        this.applicationId = applicationId;
    }

    public Long getMessageId() {
        return messageId;
    }

    public void setMessageId(Long messageId) {
        this.messageId = messageId;
    }

    public Long getReportId() {
        return reportId;
    }

    public void setReportId(Long reportId) {
        this.reportId = reportId;
    }

    public Long getSessionId() {
        return sessionId;
    }

    public void setSessionId(Long sessionId) {
        this.sessionId = sessionId;
    }

    public String getDedupeKey() {
        return dedupeKey;
    }

    public void setDedupeKey(String dedupeKey) {
        this.dedupeKey = dedupeKey;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getReadAt() {
        return readAt;
    }

    public void setReadAt(String readAt) {
        this.readAt = readAt;
    }
}