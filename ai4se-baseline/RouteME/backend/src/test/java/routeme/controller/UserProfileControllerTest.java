package routeme.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.UUID;
import java.util.stream.Stream;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;

/**
 * 资料端点的 API 验收：读取 / 保存 / 头像上传、字段级 400、401 / 403 与生日隐私。
 *
 * <p>使用固定时钟（2026-06-01）与独立临时头像目录，不依赖开发者本机数据。</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class UserProfileControllerTest {

    private static final Instant NOW = Instant.parse("2026-06-01T00:00:00Z");
    private static final Path AVATAR_DIRECTORY = createAvatarDirectory();

    private static final byte[] JPEG = {
            (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10,
            'J', 'F', 'I', 'F', 0x00};

    private static final String COMPLETE_BODY = """
            {"nickname":"小夏","birthday":"2003-05-18","gender":"女","city":"珠海",
             "school":"中山大学","major":"地理科学","interests":["摄影","美食","徒步"],
             "travel_style":"休闲游"}
            """;

    @Autowired
    private MockMvc mockMvc;

    @TestConfiguration
    static class FixedClockConfiguration {

        @Bean
        @Primary
        Clock fixedClock() {
            return Clock.fixed(NOW, ZoneOffset.UTC);
        }
    }

    @DynamicPropertySource
    static void avatarDirectory(DynamicPropertyRegistry registry) {
        registry.add("routeme.profile.avatar-dir", AVATAR_DIRECTORY::toString);
    }

    @AfterAll
    static void deleteAvatarDirectory() throws IOException {
        try (Stream<Path> paths = Files.walk(AVATAR_DIRECTORY)) {
            paths.sorted(Comparator.reverseOrder()).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException exception) {
                    throw new UncheckedIOException(exception);
                }
            });
        }
    }

    @Test
    void in_completeRequiredProfile_out_savedAndComplete() throws Exception {
        String session = register("小夏");

        mockMvc.perform(put("/api/users/me/profile")
                        .header("Authorization", bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(COMPLETE_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nickname").value("小夏"))
                .andExpect(jsonPath("$.birthday").value("2003-05-18"))
                .andExpect(jsonPath("$.age").value(23))
                .andExpect(jsonPath("$.zodiac").value("金牛"))
                .andExpect(jsonPath("$.gender").value("女"))
                .andExpect(jsonPath("$.city").value("珠海"))
                .andExpect(jsonPath("$.school").value("中山大学"))
                .andExpect(jsonPath("$.major").value("地理科学"))
                .andExpect(jsonPath("$.interests.length()").value(3))
                .andExpect(jsonPath("$.travel_style").value("休闲游"))
                .andExpect(jsonPath("$.profile_complete").value(true));
    }

    @Test
    void in_missingRequiredFields_out_invalidInputWithFields() throws Exception {
        String session = register("小夏");

        mockMvc.perform(put("/api/users/me/profile")
                        .header("Authorization", bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nickname\":\"小夏\",\"job\":\"学生\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.fields.birthday").value("REQUIRED"))
                .andExpect(jsonPath("$.fields.gender").value("REQUIRED"))
                .andExpect(jsonPath("$.fields.city").value("REQUIRED"))
                .andExpect(jsonPath("$.fields.interests").value("TOO_FEW"))
                .andExpect(jsonPath("$.fields.travel_style").value("REQUIRED"))
                .andExpect(jsonPath("$.fields.nickname").doesNotExist());
    }

    @Test
    void in_optionalFieldsEmpty_out_saved() throws Exception {
        String session = register("小夏");

        mockMvc.perform(put("/api/users/me/profile")
                        .header("Authorization", bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nickname":"小夏","birthday":"2003-05-18","gender":"女","city":"珠海",
                                 "school":"","major":"","job":"","mbti":"","bio":"",
                                 "interests":["摄影","美食","徒步"],"travel_style":"休闲游"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profile_complete").value(true))
                .andExpect(jsonPath("$.school").doesNotExist())
                .andExpect(jsonPath("$.major").doesNotExist())
                .andExpect(jsonPath("$.job").doesNotExist())
                .andExpect(jsonPath("$.mbti").doesNotExist())
                .andExpect(jsonPath("$.bio").doesNotExist())
                .andExpect(jsonPath("$.avatar_url").doesNotExist());
    }

    @Test
    void in_jobOnlyWithoutSchool_out_saved() throws Exception {
        String session = register("小夏");

        mockMvc.perform(put("/api/users/me/profile")
                        .header("Authorization", bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nickname":"小夏","birthday":"2003-05-18","gender":"女","city":"珠海",
                                 "job":"上班族","interests":["摄影","美食","徒步"],"travel_style":"深度游"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.school").doesNotExist())
                .andExpect(jsonPath("$.job").value("上班族"))
                .andExpect(jsonPath("$.profile_complete").value(true));
    }

    @Test
    void in_customJobOutOfPresets_out_saved() throws Exception {
        String session = register("小夏");

        mockMvc.perform(put("/api/users/me/profile")
                        .header("Authorization", bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nickname":"小夏","birthday":"2003-05-18","gender":"女","city":"珠海",
                                 "job":"独立摄影师","interests":["摄影","美食","徒步"],"travel_style":"深度游"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.job").value("独立摄影师"))
                .andExpect(jsonPath("$.profile_complete").value(true));
    }

    @Test
    void in_jobTooLong_out_invalidInput() throws Exception {
        String session = register("小夏");

        mockMvc.perform(put("/api/users/me/profile")
                        .header("Authorization", bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nickname":"小夏","job":"%s"}
                                """.formatted("职".repeat(21))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.fields.job").value("TOO_LONG"));
    }

    @Test
    void in_birthdayFutureOrMalformed_out_invalidInput() throws Exception {
        String session = register("小夏");
        saveProfile(session, COMPLETE_BODY);

        mockMvc.perform(put("/api/users/me/profile")
                        .header("Authorization", bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(COMPLETE_BODY
                                .replace("2003-05-18", "2099-01-01")
                                .replace("珠海", "深圳")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.fields.birthday").value("OUT_OF_RANGE"));

        mockMvc.perform(put("/api/users/me/profile")
                        .header("Authorization", bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(COMPLETE_BODY
                                .replace("2003-05-18", "2003-13-40")
                                .replace("珠海", "深圳")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.birthday").value("INVALID_DATE"));

        mockMvc.perform(get("/api/users/" + userId(session) + "/profile").header("X-User-Id", userId(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.birthday").value("2003-05-18"))
                .andExpect(jsonPath("$.city").value("珠海"));
    }

    @Test
    void in_birthday_out_ageAndZodiacDerived() throws Exception {
        String session = register("小夏");
        saveProfile(session, COMPLETE_BODY);

        mockMvc.perform(get("/api/users/" + userId(session) + "/profile")
                        .header("X-User-Id", userId(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.birthday").value("2003-05-18"))
                .andExpect(jsonPath("$.age").value(23))
                .andExpect(jsonPath("$.zodiac").value("金牛"));
    }

    @Test
    void in_avatarJpeg_out_urlServed() throws Exception {
        String session = register("小夏");
        MockMultipartFile file = new MockMultipartFile("file", "avatar.jpg", "image/jpeg", JPEG);

        String body = mockMvc.perform(multipart("/api/users/me/avatar")
                        .file(file)
                        .header("Authorization", bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatar_url").value(
                        org.hamcrest.Matchers.matchesPattern("/api/users/\\d+/avatar\\?v=[0-9a-f]{8}")))
                .andReturn().getResponse().getContentAsString();

        String avatarUrl = JsonPath.read(body, "$.avatar_url");

        mockMvc.perform(get(avatarUrl))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_JPEG))
                .andExpect(header().string("Cache-Control", "public, max-age=31536000, immutable"))
                .andExpect(content().bytes(JPEG));
    }

    @Test
    void in_avatarBadTypeOrOversize_out_invalidInput() throws Exception {
        String session = register("小夏");
        saveProfile(session, COMPLETE_BODY);

        mockMvc.perform(multipart("/api/users/me/avatar")
                        .file(new MockMultipartFile("file", "a.txt", "text/plain", "not an image".getBytes()))
                        .header("Authorization", bearer(session)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.fields.avatar").value("INVALID_OPTION"));

        mockMvc.perform(multipart("/api/users/me/avatar")
                        .file(new MockMultipartFile("file", "empty.png", "image/png", new byte[0]))
                        .header("Authorization", bearer(session)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.avatar").value("REQUIRED"));

        mockMvc.perform(multipart("/api/users/me/avatar")
                        .file(new MockMultipartFile(
                                "file", "huge.png", "image/png", new byte[2 * 1024 * 1024 + 1]))
                        .header("Authorization", bearer(session)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.avatar").value("OUT_OF_RANGE"));

        mockMvc.perform(get("/api/users/" + userId(session) + "/profile")
                        .header("X-User-Id", userId(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nickname").value("小夏"))
                .andExpect(jsonPath("$.profile_complete").value(true))
                .andExpect(jsonPath("$.avatar_url").doesNotExist());
    }

    @Test
    void in_otherUserProfile_out_birthdayOmitted() throws Exception {
        String owner = register("小夏");
        saveProfile(owner, COMPLETE_BODY);
        String viewer = register("路人");

        mockMvc.perform(get("/api/users/" + userId(owner) + "/profile")
                        .header("X-User-Id", userId(viewer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nickname").value("小夏"))
                .andExpect(jsonPath("$.avatar_initial").value("小"))
                .andExpect(jsonPath("$.birthday").doesNotExist())
                .andExpect(jsonPath("$.age").value(23))
                .andExpect(jsonPath("$.zodiac").value("金牛"))
                .andExpect(jsonPath("$.profile_complete").value(true));

        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$..birthday").doesNotExist());
    }

    @Test
    void in_legacyUserIdHeaderOnly_out_sessionInvalid() throws Exception {
        // 写入口已不再接受 X-User-Id；即使指向已落库凭据的周野（id 4），也必须 401。
        mockMvc.perform(put("/api/users/me/profile")
                        .header("X-User-Id", "4")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(COMPLETE_BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_INVALID"));

        mockMvc.perform(multipart("/api/users/me/avatar")
                        .file(new MockMultipartFile("file", "avatar.jpg", "image/jpeg", JPEG))
                        .header("X-User-Id", "4"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_INVALID"));
    }

    @Test
    void in_noSessionSave_out_sessionInvalid() throws Exception {
        mockMvc.perform(put("/api/users/me/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(COMPLETE_BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_INVALID"));

        mockMvc.perform(multipart("/api/users/me/avatar")
                        .file(new MockMultipartFile("file", "avatar.jpg", "image/jpeg", JPEG)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_INVALID"));

        mockMvc.perform(put("/api/users/me/profile")
                        .header("X-User-Id", "9999")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(COMPLETE_BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_INVALID"));
    }

    @Test
    void in_profileReadWithoutCaller_out_demoUserRequired() throws Exception {
        String session = register("小夏");

        mockMvc.perform(get("/api/users/" + userId(session) + "/profile"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("DEMO_USER_REQUIRED"));

        mockMvc.perform(get("/api/users/" + userId(session) + "/profile").header("X-User-Id", "9999"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("DEMO_USER_REQUIRED"));
    }

    @Test
    void in_unknownTargetProfile_out_userNotFound() throws Exception {
        mockMvc.perform(get("/api/users/9999/profile").header("X-User-Id", "1"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("USER_NOT_FOUND"));
    }

    @Test
    void in_seededProfileRead_out_joinedAtAndStats() throws Exception {
        mockMvc.perform(get("/api/users/2/profile").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.joined_at").exists())
                .andExpect(jsonPath("$.stats.published").value(3))
                .andExpect(jsonPath("$.stats.completed").value(1))
                .andExpect(jsonPath("$.stats.joined").value(2))
                .andExpect(jsonPath("$.stats.shared").value(1));
    }

    @Test
    void in_seededDemoProfile_out_completeWithJobAndMbti() throws Exception {
        mockMvc.perform(get("/api/users/1/profile").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nickname").value("林见夏"))
                .andExpect(jsonPath("$.school").value("大三 · 视觉传达"))
                .andExpect(jsonPath("$.job").value("学生"))
                .andExpect(jsonPath("$.mbti").value("ISFP"))
                .andExpect(jsonPath("$.city").value("珠海"))
                .andExpect(jsonPath("$.travel_style").value("休闲游"))
                .andExpect(jsonPath("$.birthday").value("2005-06-12"))
                .andExpect(jsonPath("$.zodiac").value("双子"))
                .andExpect(jsonPath("$.profile_complete").value(true));

        mockMvc.perform(get("/api/users/4/profile").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nickname").value("周野"))
                .andExpect(jsonPath("$.school").doesNotExist())
                .andExpect(jsonPath("$.job").value("产品经理"))
                .andExpect(jsonPath("$.mbti").value("INFP"))
                .andExpect(jsonPath("$.city").value("上海"))
                .andExpect(jsonPath("$.birthday").doesNotExist())
                .andExpect(jsonPath("$.profile_complete").value(true));
    }

    @Test
    void in_avatarReadWithoutAvatar_out_notFound() throws Exception {
        String session = register("小夏");

        mockMvc.perform(get("/api/users/" + userId(session) + "/avatar"))
                .andExpect(status().isNotFound());
    }

    private void saveProfile(String session, String body) throws Exception {
        mockMvc.perform(put("/api/users/me/profile")
                        .header("Authorization", bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());
    }

    private String register(String nickname) throws Exception {
        String body = """
                {"username":"%s","password":"routeme-demo","nickname":"%s"}
                """.formatted(uniqueUsername(), nickname);
        return mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
    }

    private static String uniqueUsername() {
        return "p" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    private static String bearer(String session) {
        return "Bearer " + JsonPath.read(session, "$.token");
    }

    private static long userId(String session) {
        Number id = JsonPath.read(session, "$.user.id");
        return id.longValue();
    }

    private static Path createAvatarDirectory() {
        try {
            return Files.createTempDirectory("routeme-avatar-");
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }
}