package routeme.service;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import routeme.enums.TripStatusEnum;
import routeme.pojo.TripPlan;
import routeme.request.TripQuery;

@SpringBootTest
@Transactional
class TripPlanServicePersistenceTest {

    @Autowired
    private TripPlanService tripPlanService;

    @Autowired
    private DemoUserService demoUserService;

    @Test
    void in_seededData_out_unfinishedTripsWithProjectedStatus() {
        // When
        List<TripPlan> unfinished = tripPlanService.findOpen(TripQuery.empty());
        TripPlan full = tripPlanService.require(6L);
        TripPlan completed = tripPlanService.require(1L);

        // Then
        assertAll(
                () -> assertTrue(unfinished.stream().noneMatch(trip -> trip.status() == TripStatusEnum.COMPLETED),
                        "unfinished list excludes completed trips"),
                () -> assertTrue(unfinished.stream().map(TripPlan::id).toList().containsAll(List.of(3L, 4L, 5L, 6L, 7L)),
                        "seeded unfinished trips are returned"),
                () -> assertEquals(TripStatusEnum.FULL, full.status(), "joined_count reaches capacity"),
                () -> assertEquals(TripStatusEnum.COMPLETED, completed.status(), "completed_at wins"),
                () -> assertTrue(full.tags().contains("历史"), "tags parsed from json"),
                () -> assertEquals(2, full.joinedCount(), "joined count"),
                () -> assertEquals(4, demoUserService.findAll().size(), "demo users")
        );
    }
}