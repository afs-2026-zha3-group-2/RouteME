package routeme.repository;

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
import routeme.model.TripExperience;
import routeme.repository.TripExperienceRepository;

@SpringBootTest
@Transactional
class TripExperienceRepositoryTest {

    @Autowired
    private TripExperienceRepository repository;

    @Test
    void in_seededData_out_experiencesByTripAuthorAndAll() {
        // When
        List<TripExperience> trip1 = repository.findByTrip(1L);
        List<TripExperience> mine = repository.findByAuthor(2L);
        List<TripExperience> all = repository.findAll();

        // Then
        assertAll(
                () -> assertEquals(1, trip1.size(), "trip 1 has one experience"),
                () -> assertEquals(ExperienceIntensityEnum.MODERATE, trip1.get(0).intensity(), "trip 1 intensity"),
                () -> assertEquals(1, mine.size(), "user 2 shared once"),
                () -> assertEquals(2, all.size(), "two seeded experiences"),
                () -> assertEquals(1, all.get(0).id(), "newest updated first"),
                () -> assertTrue(repository.findByTripAndAuthor(1L, 2L).isPresent(), "lookup by trip and author"),
                () -> assertTrue(repository.findByTripAndAuthor(1L, 3L).isEmpty(), "unknown pair"));
    }

    @Test
    void in_newExperience_out_insertedWithNextId() {
        // Given
        TripExperience experience = TripExperience.create(
                        3L, 1L, "字".repeat(12), "tiring", "带水", Instant.parse("2026-11-15T09:00:00Z"))
                .withId(repository.nextId());

        // When
        repository.insert(experience);
        TripExperience saved = repository.findByTripAndAuthor(3L, 1L).orElseThrow();

        // Then
        assertAll(
                () -> assertEquals(3, saved.id(), "next id"),
                () -> assertEquals(ExperienceIntensityEnum.TIRING, saved.intensity(), "intensity"),
                () -> assertEquals("带水", saved.advice(), "advice"));
    }

    @Test
    void in_existingExperience_out_updatedContent() {
        // Given
        Instant later = Instant.parse("2026-11-15T10:00:00Z");
        TripExperience original = repository.findByTripAndAuthor(1L, 2L).orElseThrow();

        // When
        repository.update(original.withContent("字".repeat(20), "relaxed", "新建议", later));
        TripExperience updated = repository.findByTripAndAuthor(1L, 2L).orElseThrow();

        // Then
        assertAll(
                () -> assertEquals(ExperienceIntensityEnum.RELAXED, updated.intensity(), "intensity updated"),
                () -> assertEquals("新建议", updated.advice(), "advice updated"),
                () -> assertEquals(later, updated.updatedAt(), "updated at"),
                () -> assertEquals(original.createdAt(), updated.createdAt(), "created at kept"));
    }
}