package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;

import routeme.entity.TripExperiencePhotoEntity;
import routeme.mapper.TripExperiencePhotoMapper;
import routeme.utils.ExperiencePhotoStorage;

/**
 * 体验图片上传的 API 验收：资格、401、大小 / 魔数 / 数量、EXIF 剥离与 24h 懒清理。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ExperiencePhotoApiTest {

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
    private ExperiencePhotoStorage storage;

    @Test
    void in_eligibleAuthor_out_photoStoredWithoutExif() throws Exception {
        // When
        mockMvc.perform(multipart("/api/trips/1/experiences/photos")
                        .file(jpegFile("trip.jpg", withExifJpeg()))
                        .header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.url").value(org.hamcrest.Matchers.startsWith("/api/experience-photos/")));

        // Then
        List<TripExperiencePhotoEntity> rows = photoMapper.selectByScope(1, 2);
        assertEquals(1, rows.size(), "one photo row");
        byte[] stored = storage.load(rows.getFirst().getFileName()).orElseThrow();
        assertFalse(contains(stored, "Exif".getBytes(StandardCharsets.ISO_8859_1)), "exif stripped");
        assertTrue(contains(stored, "JFIF".getBytes(StandardCharsets.ISO_8859_1)), "image kept");
    }

    @Test
    void in_uploadedPhoto_out_publiclyReadableWithoutExif() throws Exception {
        // Given
        MvcResult uploaded = mockMvc.perform(multipart("/api/trips/1/experiences/photos")
                        .file(jpegFile("trip.jpg", withExifJpeg()))
                        .header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andReturn();
        Number photoId = JsonPath.read(uploaded.getResponse().getContentAsString(), "$.id");

        // When
        byte[] body = mockMvc.perform(get("/api/experience-photos/" + photoId.longValue()))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "public, max-age=86400"))
                .andExpect(content().contentType(MediaType.IMAGE_JPEG))
                .andReturn().getResponse().getContentAsByteArray();

        // Then
        assertFalse(contains(body, "Exif".getBytes(StandardCharsets.ISO_8859_1)), "read bytes keep stripped");
    }

    @Test
    void in_missingPhoto_out_notFound() throws Exception {
        mockMvc.perform(get("/api/experience-photos/999999"))
                .andExpect(status().isNotFound());
    }

    @Test
    void in_seventhPhoto_out_invalidInput() throws Exception {
        for (int index = 0; index < 6; index++) {
            mockMvc.perform(multipart("/api/trips/1/experiences/photos")
                            .file(jpegFile("trip-" + index + ".jpg", withExifJpeg()))
                            .header("X-User-Id", "2"))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(multipart("/api/trips/1/experiences/photos")
                        .file(jpegFile("trip-7.jpg", withExifJpeg()))
                        .header("X-User-Id", "2"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_oversizeOrWrongMagic_out_invalidInput() throws Exception {
        byte[] oversize = new byte[5 * 1024 * 1024 + 1];
        System.arraycopy(withExifJpeg(), 0, oversize, 0, 4);

        mockMvc.perform(multipart("/api/trips/1/experiences/photos")
                        .file(new MockMultipartFile("file", "big.jpg", "image/jpeg", oversize))
                        .header("X-User-Id", "2"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));

        mockMvc.perform(multipart("/api/trips/1/experiences/photos")
                        .file(new MockMultipartFile("file", "notes.jpg", "image/jpeg", "not an image".getBytes()))
                        .header("X-User-Id", "2"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_missingUser_out_unauthorizedAndNoFile() throws Exception {
        long before = photoFileCount();

        mockMvc.perform(multipart("/api/trips/1/experiences/photos")
                        .file(jpegFile("trip.jpg", withExifJpeg())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("DEMO_USER_REQUIRED"));

        assertEquals(before, photoFileCount(), "no file written");
    }

    @Test
    void in_nonParticipant_out_forbidden() throws Exception {
        mockMvc.perform(multipart("/api/trips/1/experiences/photos")
                        .file(jpegFile("trip.jpg", withExifJpeg()))
                        .header("X-User-Id", "3"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("EXPERIENCE_NOT_ALLOWED"));
    }

    @Test
    void in_staleUnownedPhoto_out_cleanedOnNextUpload() throws Exception {
        // Given: 一张 25h 前上传的未绑定图，和一张已绑定到体验 1 的旧图
        TripExperiencePhotoEntity stale = photoRow(9001, null);
        photoMapper.insert(stale);
        TripExperiencePhotoEntity bound = photoRow(9002, 1L);
        photoMapper.insert(bound);
        String staleFile = storage.store(1, 2, routeme.utils.PhotoMagic.Format.JPEG, withExifJpeg());
        stale.setFileName(staleFile);
        photoMapper.updateById(stale);
        String boundFile = storage.store(1, 2, routeme.utils.PhotoMagic.Format.JPEG, withExifJpeg());
        bound.setFileName(boundFile);
        photoMapper.updateById(bound);

        // When
        mockMvc.perform(multipart("/api/trips/1/experiences/photos")
                        .file(jpegFile("fresh.jpg", withExifJpeg()))
                        .header("X-User-Id", "2"))
                .andExpect(status().isOk());

        // Then
        assertNull(photoMapper.selectById(9001L), "stale unowned photo removed");
        assertTrue(storage.load(staleFile).isEmpty(), "stale file removed");
        mockMvc.perform(get("/api/experience-photos/9001")).andExpect(status().isNotFound());
        assertNotNull(photoMapper.selectById(9002L), "bound photo kept");
        assertTrue(storage.load(boundFile).isPresent(), "bound file kept");
    }

    private TripExperiencePhotoEntity photoRow(long id, Long experienceId) {
        TripExperiencePhotoEntity entity = new TripExperiencePhotoEntity();
        entity.setId(id);
        entity.setTripId(1L);
        entity.setAuthorId(2L);
        entity.setExperienceId(experienceId);
        entity.setFileName("placeholder.jpg");
        entity.setMime("image/jpeg");
        entity.setBytes(10L);
        entity.setSortOrder(0);
        entity.setCreatedAt(Instant.now().minus(25, ChronoUnit.HOURS).toString());
        return entity;
    }

    private MockMultipartFile jpegFile(String name, byte[] content) {
        return new MockMultipartFile("file", name, "image/jpeg", content);
    }

    private byte[] withExifJpeg() {
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

    private boolean contains(byte[] content, byte[] needle) {
        outer:
        for (int i = 0; i + needle.length <= content.length; i++) {
            for (int j = 0; j < needle.length; j++) {
                if (content[i + j] != needle[j]) {
                    continue outer;
                }
            }
            return true;
        }
        return false;
    }

    private long photoFileCount() {
        try (var files = Files.list(PHOTO_DIRECTORY)) {
            return files.count();
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }

    private static Path createPhotoDirectory() {
        try {
            return Files.createTempDirectory("routeme-experience-photos-");
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }
}
