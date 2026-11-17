package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;

import routeme.entity.TripExperiencePhotoEntity;
import routeme.mapper.TripExperiencePhotoMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ExperienceControllerTest {

    private static final String VALID_BODY = """
            {"content":"整条线基本没有爬升，日落前四十分钟到海边刚好。","intensity":"moderate","advice":"带一件防风外套。"}
            """;

    private static final Path PHOTO_DIRECTORY = createPhotoDirectory();

    @DynamicPropertySource
    static void photoDirectory(DynamicPropertyRegistry registry) {
        registry.add("routeme.experience.photo-dir", PHOTO_DIRECTORY::toString);
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TripExperiencePhotoMapper photoMapper;

    @Autowired
    private JdbcClient jdbcClient;

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
    void in_uploadedPhotos_out_boundInOrder() throws Exception {
        long first = uploadPhoto(1, "2");
        long second = uploadPhoto(1, "2");

        mockMvc.perform(post("/api/trips/1/experiences")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"整条线基本没有爬升，日落前四十分钟到海边刚好。","intensity":"moderate","advice":"带一件防风外套。","photo_ids":[%d,%d]}
                                """.formatted(second, first)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.photos.length()").value(2))
                .andExpect(jsonPath("$.photos[0].id").value(second))
                .andExpect(jsonPath("$.photos[1].id").value(first))
                .andExpect(jsonPath("$.photos[0].url").value("/api/experience-photos/" + second));

        mockMvc.perform(get("/api/trips/1/experiences").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].photos.length()").value(2))
                .andExpect(jsonPath("$[0].photos[0].id").value(second));
    }

    @Test
    void in_foreignPhoto_out_forbidden() throws Exception {
        insertPhoto(7101, 1, 3, null);

        mockMvc.perform(post("/api/trips/1/experiences")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bodyWithPhotos(7101)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void in_missingPhoto_out_invalidInput() throws Exception {
        mockMvc.perform(post("/api/trips/1/experiences")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bodyWithPhotos(7199)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_photoBoundToAnotherExperience_out_invalidInput() throws Exception {
        insertPhoto(7102, 1, 2, 2L);

        mockMvc.perform(post("/api/trips/1/experiences")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bodyWithPhotos(7102)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_historicalExperiences_out_emptyPhotoArray() throws Exception {
        mockMvc.perform(get("/api/experiences").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].photos").isArray())
                .andExpect(jsonPath("$.items[0].photos.length()").value(0));
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
                .andExpect(jsonPath("$.intensity").value("moderate"))
                .andExpect(jsonPath("$.photos.length()").value(0));

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

    private long uploadPhoto(long tripId, String userId) throws Exception {
        MvcResult result = mockMvc.perform(multipart("/api/trips/" + tripId + "/experiences/photos")
                        .file(new MockMultipartFile("file", "trip.jpg", "image/jpeg", jpeg()))
                        .header("X-User-Id", userId))
                .andExpect(status().isOk())
                .andReturn();
        Number id = JsonPath.read(result.getResponse().getContentAsString(), "$.id");
        return id.longValue();
    }

    private String bodyWithPhotos(long... photoIds) {
        StringBuilder ids = new StringBuilder();
        for (long photoId : photoIds) {
            if (!ids.isEmpty()) {
                ids.append(',');
            }
            ids.append(photoId);
        }
        return """
                {"content":"整条线基本没有爬升，日落前四十分钟到海边刚好。","intensity":"moderate","advice":"带一件防风外套。","photo_ids":[%s]}
                """.formatted(ids);
    }

    private void insertPhoto(long id, long tripId, long authorId, Long experienceId) {
        TripExperiencePhotoEntity entity = new TripExperiencePhotoEntity();
        entity.setId(id);
        entity.setTripId(tripId);
        entity.setAuthorId(authorId);
        entity.setExperienceId(experienceId);
        entity.setFileName("test-" + id + ".jpg");
        entity.setMime("image/jpeg");
        entity.setBytes(10L);
        entity.setSortOrder(0);
        entity.setCreatedAt(Instant.now().toString());
        photoMapper.insert(entity);
    }

    private byte[] jpeg() {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            out.write(0xFF);
            out.write(0xD8);
            writeSegment(out, 0xE1, "Exif\u0000\u0000GPS".getBytes(StandardCharsets.ISO_8859_1));
            writeSegment(out, 0xE0, "JFIF\u0000".getBytes(StandardCharsets.ISO_8859_1));
            out.write(0xFF);
            out.write(0xDA);
            out.write(new byte[]{1, 2, 3, 4}, 0, 4);
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
        return out.toByteArray();
    }

    private void writeSegment(ByteArrayOutputStream out, int marker, byte[] payload) throws IOException {
        int length = payload.length + 2;
        out.write(0xFF);
        out.write(marker);
        out.write((length >> 8) & 0xFF);
        out.write(length & 0xFF);
        out.write(payload, 0, payload.length);
    }

    private static Path createPhotoDirectory() {
        try {
            return Files.createTempDirectory("routeme-experience-photos-");
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }

    @Test
    void in_suspendedAuthor_out_accountSuspendedAndNoNewExperience() throws Exception {
        jdbcClient.sql("UPDATE app_users SET status = 'SUSPENDED' WHERE id = 1").update();
        Integer before = jdbcClient.sql("SELECT COUNT(*) FROM trip_experiences")
                .query(Integer.class)
                .single();

        mockMvc.perform(post("/api/trips/1/experiences")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCOUNT_SUSPENDED"));

        Integer after = jdbcClient.sql("SELECT COUNT(*) FROM trip_experiences")
                .query(Integer.class)
                .single();
        assertEquals(before, after, "suspended author writes no experience row");
    }
}
