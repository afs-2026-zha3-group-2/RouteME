package routeme.service;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import routeme.response.ExperienceResponse;
import routeme.response.ExperienceSaveResponse;
import routeme.request.ExperienceWriteRequest;
import routeme.exception.ExperienceNotAllowedException;

@SpringBootTest
@Transactional
class ExperienceServiceTest {

    private static final ExperienceWriteRequest VALID =
            new ExperienceWriteRequest("整条线基本没有爬升，日落前四十分钟到海边刚好。", "moderate", "带一件防风外套。");

    @Autowired
    private ExperienceService experienceService;

    @Test
    void in_publisherOfCompletedTrip_out_createdExperience() {
        // When
        ExperienceSaveResponse result = experienceService.upsert(1L, 1L, VALID);

        // Then
        assertAll(
                () -> assertTrue(result.created(), "first save creates"),
                () -> assertEquals(1L, result.experience().trip().id(), "trip"),
                () -> assertEquals(1L, result.experience().author().id(), "author is publisher"),
                () -> assertEquals("moderate", result.experience().intensity(), "intensity wire value"),
                () -> assertEquals(1, experienceService.listByTrip(1L).stream()
                        .filter(item -> item.author().id() == 1L)
                        .count(), "one per author"));
    }

    @Test
    void in_companionResubmits_out_updatedNotDuplicated() {
        // Given
        long existingId = experienceService.listByTrip(1L).get(0).id();

        // When
        ExperienceSaveResponse result = experienceService.upsert(
                1L, 2L, new ExperienceWriteRequest("改成更具体的感受：风很大，日落机位要早到。", "relaxed", "防风外套必带。"));

        // Then
        assertAll(
                () -> assertFalse(result.created(), "second save updates"),
                () -> assertEquals(existingId, result.experience().id(), "same experience id"),
                () -> assertEquals("relaxed", result.experience().intensity(), "intensity updated"),
                () -> assertEquals(1, experienceService.listByTrip(1L).size(), "no duplicate row"));
    }

    @Test
    void in_nonParticipant_out_rejected() {
        assertThrows(ExperienceNotAllowedException.class, () -> experienceService.upsert(1L, 3L, VALID));
    }

    @Test
    void in_unfinishedTrip_out_rejected() {
        assertThrows(ExperienceNotAllowedException.class, () -> experienceService.upsert(3L, 1L, VALID));
    }

    @Test
    void in_filters_out_matchingExperiences() {
        // When
        List<ExperienceResponse> zhuhai = experienceService.listAll(null, "珠海", Set.of());
        List<ExperienceResponse> camping = experienceService.listAll("露营", null, Set.of());
        List<ExperienceResponse> tagged = experienceService.listAll(null, null, Set.of("露营"));

        // Then
        assertAll(
                () -> assertEquals(1, zhuhai.size(), "destination filter"),
                () -> assertEquals(1, camping.size(), "keyword hits trip title/content"),
                () -> assertEquals(1, tagged.size(), "tag filter"),
                () -> assertEquals(2L, tagged.get(0).trip().id(), "tagged experience belongs to trip 2"));
    }

    @Test
    void in_updatedExperience_out_movesToTopOfList() {
        // When
        experienceService.upsert(2L, 3L, new ExperienceWriteRequest(
                "第二次走这条线，碎石段还是最累，但营地星空依旧值得。", "tiring", "鞋要抓地，水在山下买齐。"));

        // Then
        List<ExperienceResponse> all = experienceService.listAll(null, null, Set.of());
        assertAll(
                () -> assertEquals(2, all.size(), "two experiences"),
                () -> assertEquals(2L, all.get(0).trip().id(), "recently updated first"));
    }

    @Test
    void in_mine_out_onlyMyExperiences() {
        assertAll(
                () -> assertEquals(1, experienceService.mine(2L).size(), "user 2 shared once"),
                () -> assertTrue(experienceService.mine(1L).isEmpty(), "user 1 has not shared yet"));
    }
}