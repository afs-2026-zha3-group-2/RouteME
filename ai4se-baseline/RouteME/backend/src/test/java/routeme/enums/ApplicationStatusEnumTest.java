package routeme.enums;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import org.junit.jupiter.api.Test;

class ApplicationStatusEnumTest {

    @Test
    void in_status_out_wireValueAndDbName() {
        assertAll(
                () -> assertEquals("pending", ApplicationStatusEnum.PENDING.wireValue(), "pending wire"),
                () -> assertEquals("accepted", ApplicationStatusEnum.ACCEPTED.wireValue(), "accepted wire"),
                () -> assertEquals("rejected", ApplicationStatusEnum.REJECTED.wireValue(), "rejected wire"),
                () -> assertEquals("cancelled", ApplicationStatusEnum.CANCELLED.wireValue(), "cancelled wire"),
                () -> assertEquals(ApplicationStatusEnum.PENDING, ApplicationStatusEnum.valueOf("PENDING"), "db name")
        );
    }

    @Test
    void in_terminalStatus_out_distinctFromActive() {
        assertNotEquals(ApplicationStatusEnum.PENDING, ApplicationStatusEnum.REJECTED);
        assertNotEquals(ApplicationStatusEnum.ACCEPTED, ApplicationStatusEnum.CANCELLED);
    }
}