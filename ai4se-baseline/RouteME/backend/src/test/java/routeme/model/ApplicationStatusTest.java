package routeme.model;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import org.junit.jupiter.api.Test;

class ApplicationStatusTest {

    @Test
    void in_status_out_wireValueAndDbName() {
        assertAll(
                () -> assertEquals("pending", ApplicationStatus.PENDING.wireValue(), "pending wire"),
                () -> assertEquals("accepted", ApplicationStatus.ACCEPTED.wireValue(), "accepted wire"),
                () -> assertEquals("rejected", ApplicationStatus.REJECTED.wireValue(), "rejected wire"),
                () -> assertEquals("cancelled", ApplicationStatus.CANCELLED.wireValue(), "cancelled wire"),
                () -> assertEquals(ApplicationStatus.PENDING, ApplicationStatus.valueOf("PENDING"), "db name")
        );
    }

    @Test
    void in_terminalStatus_out_distinctFromActive() {
        assertNotEquals(ApplicationStatus.PENDING, ApplicationStatus.REJECTED);
        assertNotEquals(ApplicationStatus.ACCEPTED, ApplicationStatus.CANCELLED);
    }
}