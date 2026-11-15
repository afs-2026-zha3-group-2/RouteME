package routeme.dao;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import routeme.model.TripPlan;
import routeme.model.TripStatus;

@SpringBootTest
class DatabaseTripPlanRepositoryTest {

    @Autowired
    private TripPlanRepository tripPlanRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void in_seededData_out_unfinishedTripsWithProjectedStatus() {
        // When
        List<TripPlan> unfinished = tripPlanRepository.findUnfinished();
        TripPlan full = tripPlanRepository.findById(6L).orElseThrow();
        TripPlan completed = tripPlanRepository.findById(1L).orElseThrow();

        // Then
        assertAll(
                () -> assertTrue(unfinished.stream().noneMatch(trip -> trip.status() == TripStatus.COMPLETED),
                        "unfinished list excludes completed trips"),
                () -> assertTrue(unfinished.stream().map(TripPlan::id).toList().containsAll(List.of(3L, 4L, 5L, 6L)),
                        "seeded unfinished trips are returned"),
                () -> assertEquals(TripStatus.FULL, full.status(), "joined_count reaches capacity"),
                () -> assertEquals(TripStatus.COMPLETED, completed.status(), "completed_at wins"),
                () -> assertTrue(full.tags().contains("历史"), "tags parsed from json"),
                () -> assertEquals(2, full.joinedCount(), "joined count"),
                () -> assertEquals(3, userRepository.findAll().size(), "demo users")
        );
    }
}