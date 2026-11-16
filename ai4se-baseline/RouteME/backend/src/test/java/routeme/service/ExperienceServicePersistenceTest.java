package routeme.service;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import routeme.enums.ExperienceIntensityEnum;
import routeme.pojo.TripExperience;
import routeme.entity.TripExperienceEntity;
import routeme.response.ExperienceResponse;

@SpringBootTest
@Transactional
class ExperienceServicePersistenceTest {

    @Autowired
    private ExperienceService experienceService;

    @Test
    void in_seededData_out_experiencesByTripAndAuthor() {
        // When
        List<ExperienceResponse> trip1 = experienceService.listByTrip(1L);
        List<ExperienceResponse> mine = experienceService.mine(2L);
        List<ExperienceResponse> all = experienceService.listAll(null, java.util.Set.of());

        // Then
        assertAll(
                () -> assertEquals(1, trip1.size(), "trip 1 has one experience"),
                () -> assertEquals("moderate", trip1.get(0).intensity(), "trip 1 intensity"),
                () -> assertEquals(1, mine.size(), "user 2 shared once"),
                () -> assertEquals(2, all.size(), "two seeded experiences"),
                () -> assertEquals(1L, all.get(0).id(), "newest updated first"));
    }

    @Test
    void in_newExperience_out_insertedWithNextId() {
        // Given
        TripExperience experience = TripExperience.create(
                        3L, 1L, "字".repeat(12), "tiring", "带水", Instant.parse("2026-11-15T09:00:00Z"))
                .withId(3L);

        // When
        experienceService.save(TripExperienceEntity.from(experience));
        List<ExperienceResponse> stored = experienceService.listByTrip(3L);

        // Then
        assertAll(
                () -> assertEquals(1, stored.size(), "stored once"),
                () -> assertEquals("tiring", stored.get(0).intensity(), "intensity wire value"),
                () -> assertEquals("带水", stored.get(0).advice(), "advice"),
                () -> assertTrue(stored.get(0).id() >= 3, "id follows the seeded rows"));
    }
}