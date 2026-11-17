package routeme.entity;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.time.Instant;

import org.junit.jupiter.api.Test;

import routeme.enums.NotificationTypeEnum;
import routeme.pojo.Notification;

/**
 * 实体与领域对象的往返：时间保持纳秒精度，可空关联保持 null。
 */
class NotificationEntityTest {

    @Test
    void in_messageNotification_out_sameDomainObject() {
        // Given
        Notification notification = new Notification(
                7L, 11L, NotificationTypeEnum.MESSAGE, 12L, 3L, null, 55L,
                Instant.parse("2026-11-17T09:00:00.123456Z"), null);

        // When
        Notification roundTrip = NotificationEntity.from(notification).toNotification();

        // Then
        assertEquals(notification, roundTrip, "entity round trip keeps every field");
    }

    @Test
    void in_applicationNotification_out_nullableFieldsPreserved() {
        // Given
        Notification notification = new Notification(
                8L, 11L, NotificationTypeEnum.APPLICATION_ACCEPTED, 12L, 3L, 41L, null,
                Instant.parse("2026-11-17T09:05:00Z"), Instant.parse("2026-11-17T09:10:00Z"));

        // When
        NotificationEntity entity = NotificationEntity.from(notification);
        Notification roundTrip = entity.toNotification();

        // Then
        assertAll(
                () -> assertEquals("application_accepted", entity.getType(), "wire value stored"),
                () -> assertNull(entity.getMessageId(), "message id stays null"),
                () -> assertEquals(41L, entity.getApplicationId(), "application id kept"),
                () -> assertEquals("2026-11-17T09:05:00Z", entity.getCreatedAt(), "created_at is ISO-8601"),
                () -> assertEquals("2026-11-17T09:10:00Z", entity.getReadAt(), "read_at is ISO-8601"),
                () -> assertEquals(notification, roundTrip, "round trip keeps the read timestamp"));
    }
}