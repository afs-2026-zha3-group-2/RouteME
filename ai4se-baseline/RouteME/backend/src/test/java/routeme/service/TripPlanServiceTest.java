package routeme.service;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import routeme.exception.InvalidInput;
import routeme.exception.TripNotOpen;
import routeme.model.TripPlan;
import routeme.model.TripStatus;

@SpringBootTest
@Transactional
class TripPlanServiceTest {

    @Autowired
    private TripPlanService tripPlanService;

    @Test
    void in_recruitingTrip_out_joinedCountIncreases() {
        // When
        TripPlan updated = tripPlanService.addCompanion(3);

        // Then
        assertAll(
                () -> assertEquals(2, updated.joinedCount(), "joined count +1"),
                () -> assertEquals(TripStatus.RECRUITING, updated.status(), "still recruiting"));
    }

    @Test
    void in_fullTrip_out_addCompanionRejected() {
        assertThrows(TripNotOpen.class, () -> tripPlanService.addCompanion(6));
    }

    @Test
    void in_completedTrip_out_addCompanionRejected() {
        assertThrows(TripNotOpen.class, () -> tripPlanService.addCompanion(1));
    }

    @Test
    void in_fullTrip_out_removeCompanionReopensTrip() {
        // When
        TripPlan updated = tripPlanService.removeCompanion(6);

        // Then
        assertAll(
                () -> assertEquals(1, updated.joinedCount(), "joined count -1"),
                () -> assertEquals(TripStatus.RECRUITING, updated.status(), "status falls back to recruiting"));
    }

    @Test
    void in_tripWithPublisherOnly_out_removeCompanionRejected() {
        assertThrows(InvalidInput.class, () -> tripPlanService.removeCompanion(3));
    }
}