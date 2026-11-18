package routeme.entity;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.time.Instant;

import org.junit.jupiter.api.Test;

import routeme.enums.NotificationPriorityEnum;
import routeme.enums.NotificationTypeEnum;
import routeme.pojo.Notification;

/**
 * 实体与领域对象的往返：时间保持纳秒精度，可空关联保持 null。
 */
class NotificationEntityTest {

    @Test
    void in_chatNotification_out_sameDomainObject() {
        // Given
        Notification notification = new Notification(
                7L,
                11L,
                NotificationTypeEnum.CHAT,
                "message",
                "新的同行消息",
                "「小周」发来一条消息（「周末去珠海骑行」）。",
                NotificationPriorityEnum.NORMAL,
                12L,
                3L,
                null,
                55L,
                null,
                null,
                "message:55",
                Instant.parse("2026-11-17T09:00:00.123456Z"),
                null);

        // When
        Notification roundTrip = NotificationEntity.from(notification).toNotification();

        // Then
        assertAll(
                () -> assertEquals(notification, roundTrip, "entity round trip keeps every field"),
                () -> assertEquals("CHAT", NotificationEntity.from(notification).getType(), "type wire value"),
                () -> assertEquals("NORMAL", NotificationEntity.from(notification).getPriority(), "priority"));
    }

    @Test
    void in_reportNotification_out_nullableFieldsPreserved() {
        // Given
        Notification notification = new Notification(
                8L,
                11L,
                NotificationTypeEnum.REPORT,
                "report_resolved",
                "举报已处理",
                "你提交的举报（编号 R-42）已完成处理。",
                NotificationPriorityEnum.HIGH,
                null,
                null,
                null,
                null,
                42L,
                null,
                "report_resolved:42",
                Instant.parse("2026-11-17T09:05:00Z"),
                Instant.parse("2026-11-17T09:10:00Z"));

        // When
        NotificationEntity entity = NotificationEntity.from(notification);

        // Then
        assertAll(
                () -> assertNull(entity.getActorId(), "system-ish rows carry no actor"),
                () -> assertNull(entity.getTripId(), "report rows carry no trip"),
                () -> assertEquals(42L, entity.getReportId(), "report id kept"),
                () -> assertEquals("2026-11-17T09:05:00Z", entity.getCreatedAt(), "created_at is ISO-8601"),
                () -> assertEquals("2026-11-17T09:10:00Z", entity.getReadAt(), "read_at is ISO-8601"),
                () -> assertEquals(notification, entity.toNotification(), "round trip keeps the read timestamp"));
    }
}