package routeme.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ExperienceControllerTest {

    private static final String VALID_BODY = """
            {"content":"整条线基本没有爬升，日落前四十分钟到海边刚好。","intensity":"moderate","advice":"带一件防风外套。"}
            """;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void in_seededData_out_experienceList() throws Exception {
        mockMvc.perform(get("/api/experiences").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.total_pages").value(1))
                .andExpect(jsonPath("$.items[0].trip.title").exists())
                .andExpect(jsonPath("$.items[0].author.nickname").exists())
                .andExpect(jsonPath("$.items[0].intensity").value("moderate"))
                .andExpect(jsonPath("$.items[0].advice").isNotEmpty());
    }

    @Test
    void in_filters_out_matchingExperiences() throws Exception {
        mockMvc.perform(get("/api/experiences").header("X-User-Id", "1").param("destination_code", "440400"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].trip.id").value(1))
                .andExpect(jsonPath("$.items[0].trip.destination_code").value("440400"))
                .andExpect(jsonPath("$.items[0].trip.province_name").value("广东省"));

        mockMvc.perform(get("/api/experiences").header("X-User-Id", "1").param("tags", "露营"))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].trip.id").value(2));

        mockMvc.perform(get("/api/experiences").header("X-User-Id", "1")
                        .param("date_from", "2026-11-02").param("date_to", "2026-11-02"))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].trip.id").value(2));

        mockMvc.perform(get("/api/experiences").header("X-User-Id", "1").param("q", "露营"))
                .andExpect(jsonPath("$.total").value(2));
    }

    @Test
    void in_pageWindow_out_slicedExperienceItems() throws Exception {
        mockMvc.perform(get("/api/experiences").header("X-User-Id", "1").param("page", "2").param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.page").value(2))
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.total_pages").value(2));

        mockMvc.perform(get("/api/experiences").header("X-User-Id", "1").param("size", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_tripExperiences_out_listForTrip() throws Exception {
        mockMvc.perform(get("/api/trips/1/experiences").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(1));

        mockMvc.perform(get("/api/trips/3/experiences").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void in_publisherShares_out_createdThenUpdated() throws Exception {
        mockMvc.perform(post("/api/trips/1/experiences")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.trip.id").value(1))
                .andExpect(jsonPath("$.author.id").value(1))
                .andExpect(jsonPath("$.intensity").value("moderate"));

        mockMvc.perform(post("/api/trips/1/experiences")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"改成更具体的感受：风很大，日落机位要早到。","intensity":"relaxed","advice":"防风外套必带。"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.intensity").value("relaxed"));
    }

    @Test
    void in_nonParticipantShares_out_forbidden() throws Exception {
        mockMvc.perform(post("/api/trips/1/experiences")
                        .header("X-User-Id", "3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("EXPERIENCE_NOT_ALLOWED"));
    }

    @Test
    void in_unfinishedTripShares_out_forbidden() throws Exception {
        mockMvc.perform(post("/api/trips/3/experiences")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("EXPERIENCE_NOT_ALLOWED"));
    }

    @Test
    void in_shortContent_out_invalidInput() throws Exception {
        mockMvc.perform(post("/api/trips/1/experiences")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"太短\",\"intensity\":\"relaxed\",\"advice\":\"建议\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
        void in_unknownIntensity_out_invalidInput() throws Exception {
            String body = "{\"content\":\"" + "字".repeat(12) + "\",\"intensity\":\"extreme\",\"advice\":\"建议\"}";
            mockMvc.perform(post("/api/trips/1/experiences")
                            .header("X-User-Id", "1")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        }

    @Test
    void in_unknownTrip_out_notFound() throws Exception {
        mockMvc.perform(post("/api/trips/9999/experiences")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_FOUND"));
    }

    @Test
    void in_myExperiences_out_onlyMine() throws Exception {
        mockMvc.perform(get("/api/me/experiences").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].author.id").value(2));

        mockMvc.perform(get("/api/me/experiences").header("X-User-Id", "1"))
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void in_missingIdentity_out_demoUserRequired() throws Exception {
        mockMvc.perform(get("/api/experiences"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("DEMO_USER_REQUIRED"));
    }
}