package routeme.pojo;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;

import org.junit.jupiter.api.Test;

import routeme.enums.ExperienceIntensityEnum;
import routeme.exception.InvalidInputException;

class TripExperienceTest {

    private static final Instant NOW = Instant.parse("2026-11-15T09:00:00Z");

    @Test
    void in_validContent_out_trimmedExperience() {
        // When
        TripExperience experience = TripExperience.create(
                1, 2, "  整条线基本没有爬升，日落前四十分钟到海边刚好。  ", "moderate", "  带一件防风外套。  ", NOW);

        // Then
        assertAll(
                () -> assertEquals("整条线基本没有爬升，日落前四十分钟到海边刚好。", experience.content(), "content trimmed"),
                () -> assertEquals("带一件防风外套。", experience.advice(), "advice trimmed"),
                () -> assertEquals(ExperienceIntensityEnum.MODERATE, experience.intensity(), "intensity parsed"),
                () -> assertEquals(NOW, experience.createdAt(), "created at"),
                () -> assertEquals(NOW, experience.updatedAt(), "updated at"));
    }

    @Test
    void in_contentAtBoundaries_out_accepted() {
        assertAll(
                () -> assertTrue(TripExperience.create(1, 2, "字".repeat(10), "relaxed", "建议", NOW).content().length() == 10),
                () -> assertTrue(TripExperience.create(1, 2, "字".repeat(400), "relaxed", "建议", NOW).content().length() == 400),
                () -> assertEquals(120, TripExperience.create(1, 2, "字".repeat(10), "relaxed", "字".repeat(120), NOW)
                        .advice().length()));
    }

    @Test
    void in_contentOutOfRange_out_invalidInput() {
        assertAll(
                () -> assertThrows(InvalidInputException.class,
                        () -> TripExperience.create(1, 2, "字".repeat(9), "relaxed", "建议", NOW)),
                () -> assertThrows(InvalidInputException.class,
                        () -> TripExperience.create(1, 2, "字".repeat(401), "relaxed", "建议", NOW)));
    }

    @Test
    void in_blankOrTooLongAdvice_out_invalidInput() {
        assertAll(
                () -> assertThrows(InvalidInputException.class,
                        () -> TripExperience.create(1, 2, "字".repeat(10), "relaxed", "   ", NOW)),
                () -> assertThrows(InvalidInputException.class,
                        () -> TripExperience.create(1, 2, "字".repeat(10), "relaxed", "字".repeat(121), NOW)));
    }

    @Test
    void in_unknownIntensity_out_invalidInput() {
        assertThrows(InvalidInputException.class,
                () -> TripExperience.create(1, 2, "字".repeat(10), "extreme", "建议", NOW));
    }

    @Test
    void in_update_out_keepsCreatedAt() {
        // Given
        TripExperience original = TripExperience.create(1, 2, "字".repeat(10), "relaxed", "建议", NOW)
                .withId(5);
        Instant later = NOW.plusSeconds(3600);

        // When
        TripExperience updated = original.withContent("字".repeat(20), "tiring", "换个建议", later);

        // Then
        assertAll(
                () -> assertEquals(5, updated.id(), "id kept"),
                () -> assertEquals(NOW, updated.createdAt(), "created at kept"),
                () -> assertEquals(later, updated.updatedAt(), "updated at moves"),
                () -> assertEquals(ExperienceIntensityEnum.TIRING, updated.intensity(), "intensity updated"));
    }
}