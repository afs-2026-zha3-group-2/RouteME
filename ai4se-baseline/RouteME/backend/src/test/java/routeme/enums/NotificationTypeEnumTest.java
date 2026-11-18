package routeme.enums;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.Test;

/**
 * 通知类型的 wire 值固定；前端按原值分组与跳转，改名等同破坏契约。
 */
class NotificationTypeEnumTest {

    @Test
    void in_allTypes_out_wireValuesAreStable() {
        // Given
        List<NotificationTypeEnum> types = Arrays.asList(NotificationTypeEnum.values());

        // When
        List<String> wireValues = types.stream().map(NotificationTypeEnum::wireValue).toList();

        // Then
        assertAll(
                () -> assertEquals(8, types.size(), "eight notification types"),
                () -> assertEquals(
                        List.of("TRIP", "APPLICATION", "CHAT", "CREDIT",
                                "REPORT", "ACCOUNT", "SERVICE", "SYSTEM"),
                        wireValues,
                        "wire values are part of the contract"));
    }

    @Test
    void in_wireValue_out_sameType() {
        // Given / When / Then
        assertAll(
                () -> assertEquals(
                        NotificationTypeEnum.TRIP, NotificationTypeEnum.fromWire("TRIP")),
                () -> assertEquals(
                        NotificationTypeEnum.CREDIT, NotificationTypeEnum.fromWire("CREDIT")),
                () -> assertEquals(
                        NotificationTypeEnum.SYSTEM, NotificationTypeEnum.fromWire("SYSTEM")));
    }

    @Test
    void in_unknownWireValue_out_illegalArgument() {
        assertThrows(
                IllegalArgumentException.class,
                () -> NotificationTypeEnum.fromWire("application_received"),
                "old lowercase wire values are no longer part of the type enum");
    }

    @Test
    void in_everyEvent_out_typeAndWireValueDeclared() {
        // Given / When / Then
        assertAll(
                () -> assertEquals(
                        NotificationTypeEnum.TRIP,
                        NotificationEventEnum.TRIP_CANCELLED.type(),
                        "trip event maps to the trip type"),
                () -> assertEquals(
                        NotificationTypeEnum.APPLICATION,
                        NotificationEventEnum.APPLICATION_CLOSED.type(),
                        "application event maps to the application type"),
                () -> assertEquals(
                        NotificationTypeEnum.CHAT,
                        NotificationEventEnum.MESSAGE.type(),
                        "message event maps to the chat type"),
                () -> assertEquals(
                        NotificationTypeEnum.CREDIT,
                        NotificationEventEnum.CREDIT_RECOVERED.type(),
                        "credit event maps to the credit type"),
                () -> assertEquals(
                        NotificationTypeEnum.SERVICE,
                        NotificationEventEnum.SERVICE_REPLY.type(),
                        "service event maps to the service type"),
                () -> assertEquals(
                        NotificationTypeEnum.SYSTEM,
                        NotificationEventEnum.IDENTITY_VERIFIED.type(),
                        "identity event maps to the system type"),
                () -> assertEquals(
                        "trip_cancelled",
                        NotificationEventEnum.TRIP_CANCELLED.wireValue(),
                        "event wire values are snake_case"));
    }
}