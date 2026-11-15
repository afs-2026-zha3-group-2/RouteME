package routeme.dao;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import routeme.model.ApplicationStatus;
import routeme.model.TripApplication;

@SpringBootTest
@Transactional
class DatabaseTripApplicationRepositoryTest {

    @Autowired
    private TripApplicationRepository repository;

    @Test
    void in_seededData_out_applicationsByTripAndApplicant() {
        // When
        List<TripApplication> trip2 = repository.findByTrip(2L);
        List<TripApplication> mine = repository.findByApplicant(1L);
        Set<ApplicationStatus> mineStatuses = mine.stream()
                .map(TripApplication::status)
                .collect(Collectors.toSet());

        // Then
        assertAll(
                () -> assertEquals(2, trip2.size(), "trip 2 accepted applications"),
                () -> assertTrue(trip2.stream().allMatch(TripApplication::isAccepted), "trip 2 all accepted"),
                () -> assertEquals(3, mine.size(), "user 1 applications"),
                () -> assertTrue(mineStatuses.containsAll(Set.of(ApplicationStatus.ACCEPTED, ApplicationStatus.PENDING)),
                        "user 1 has accepted and pending"),
                () -> assertTrue(repository.existsActive(3L, 1L), "pending application is active"),
                () -> assertFalse(repository.existsActive(3L, 2L), "publisher has no application"),
                () -> assertTrue(repository.findAccepted(4L, 1L).isPresent(), "accepted application found")
        );
    }

    @Test
    void in_pendingApplication_out_cancelledWithDecisionTime() {
        // Given
        Instant decidedAt = Instant.parse("2026-11-15T08:00:00Z");

        // When
        repository.updateStatus(4L, ApplicationStatus.CANCELLED, decidedAt);
        TripApplication cancelled = repository.findById(4L).orElseThrow();

        // Then
        assertAll(
                () -> assertEquals(ApplicationStatus.CANCELLED, cancelled.status(), "status"),
                () -> assertEquals(decidedAt, cancelled.decidedAt(), "decided_at"),
                () -> assertFalse(cancelled.isPending(), "no longer pending")
        );
    }
}