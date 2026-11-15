package routeme.service;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import routeme.enums.ApplicationStatusEnum;
import routeme.pojo.TripApplication;

@SpringBootTest
@Transactional
class ApplicationServicePersistenceTest {

    @Autowired
    private ApplicationService applicationService;

    @Autowired
    private TripPlanService tripPlanService;

    @Test
    void in_seededData_out_applicationsByTripAndApplicant() {
        // When
        List<TripApplication> mine = applicationService.mine(1L);
        Set<ApplicationStatusEnum> mineStatuses = mine.stream()
                .map(TripApplication::status)
                .collect(Collectors.toSet());
        long trip2Companions = applicationService.participants(2L).size();

        // Then
        assertAll(
                () -> assertEquals(3, mine.size(), "user 1 applications"),
                () -> assertTrue(
                        mineStatuses.containsAll(
                                Set.of(ApplicationStatusEnum.ACCEPTED, ApplicationStatusEnum.PENDING)),
                        "user 1 has accepted and pending"),
                () -> assertEquals(3, trip2Companions, "trip 2 participants = publisher + 2 accepted"),
                () -> assertTrue(applicationService.isAccepted(4L, 1L), "accepted application found"),
                () -> assertEquals(2L, applicationService.require(1L).applicantId(), "row mapped to domain")
        );
    }

    @Test
    void in_pendingApplication_out_cancelledWithDecisionTime() {
        // When
        TripApplication cancelled = applicationService.cancel(6L, 3L);

        // Then
        assertAll(
                () -> assertEquals(ApplicationStatusEnum.CANCELLED, cancelled.status(), "cancelled"),
                () -> assertNotNull(cancelled.decidedAt(), "decision time recorded"));
    }
}