package routeme.repository;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import routeme.enums.TripStatusEnum;
import routeme.model.TripPlan;
import routeme.repository.TripPlanRepository;
import routeme.repository.UserRepository;

@SpringBootTest
class TripPlanRepositoryTest {

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
                () -> assertTrue(unfinished.stream().noneMatch(trip -> trip.status() == TripStatusEnum.COMPLETED),
                        "unfinished list excludes completed trips"),
                () -> assertTrue(unfinished.stream().map(TripPlan::id).toList().containsAll(List.of(3L, 4L, 5L, 6L)),
                        "seeded unfinished trips are returned"),
                () -> assertEquals(TripStatusEnum.FULL, full.status(), "joined_count reaches capacity"),
                () -> assertEquals(TripStatusEnum.COMPLETED, completed.status(), "completed_at wins"),
                () -> assertTrue(full.tags().contains("历史"), "tags parsed from json"),
                () -> assertEquals(2, full.joinedCount(), "joined count"),
                () -> assertEquals(3, userRepository.findAll().size(), "demo users")
        );
    }
}