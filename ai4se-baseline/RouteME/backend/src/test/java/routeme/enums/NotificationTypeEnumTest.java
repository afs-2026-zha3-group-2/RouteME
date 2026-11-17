package routeme.enums;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.Test;

/**
 * 通知类型的 wire 值固定；前端按原值分支，改名等同破坏契约。
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
                () -> assertEquals(4, types.size(), "four notification types"),
                () -> assertEquals(
                        List.of("application_received", "application_accepted",
                                "application_rejected", "message"),
                        wireValues,
                        "wire values are part of the contract"));
    }

    @Test
    void in_wireValue_out_sameType() {
        // Given / When / Then
        assertAll(
                () -> assertEquals(
                        NotificationTypeEnum.APPLICATION_RECEIVED,
                        NotificationTypeEnum.fromWire("application_received")),
                () -> assertEquals(
                        NotificationTypeEnum.APPLICATION_ACCEPTED,
                        NotificationTypeEnum.fromWire("application_accepted")),
                () -> assertEquals(
                        NotificationTypeEnum.APPLICATION_REJECTED,
                        NotificationTypeEnum.fromWire("application_rejected")),
                () -> assertEquals(
                        NotificationTypeEnum.MESSAGE,
                        NotificationTypeEnum.fromWire("message")));
    }
}