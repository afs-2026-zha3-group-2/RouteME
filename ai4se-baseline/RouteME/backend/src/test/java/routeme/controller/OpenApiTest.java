package routeme.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

/**
 * 契约测试：只验证 openapi.yaml 可解析、关键路径与必填字段在位，
 * 不替代接口行为测试。
 */
class OpenApiTest {

    private static final Path SPEC_PATH = Path.of("..", "openapi.yaml");

    private static final List<String> HTTP_METHODS = List.of("get", "post", "put", "patch", "delete");

    private static final List<String> ADMIN_CONSOLE_PATHS = List.of(
            "/admin/dashboard",
            "/admin/users",
            "/admin/users/{userId}",
            "/admin/users/{userId}/status",
            "/admin/reports",
            "/admin/reports/{reportId}",
            "/admin/reports/{reportId}/start",
            "/admin/reports/{reportId}/resolve",
            "/admin/service/sessions",
            "/admin/service/sessions/{sessionId}",
            "/admin/service/sessions/{sessionId}/join",
            "/admin/service/sessions/{sessionId}/close",
            "/help/reports",
            "/service/sessions/current",
            "/service/sessions",
            "/service/sessions/{sessionId}/messages");

    @Test
    void in_openApiFile_out_greetingContractDeclared() throws IOException {
        // Given
        assertTrue(Files.exists(SPEC_PATH), "openapi.yaml should exist at the repository root");
        Map<String, Object> document = loadYaml(SPEC_PATH);

        // When
        Map<String, Object> greetingOperation = operation(document, "/greeting", "get");
        Map<String, Object> greetingSchema = schema(document, "Greeting");

        // Then
        assertAll(
                () -> assertEquals("3.0.3", document.get("openapi"), "openapi"),
                () -> assertTrue(responses(greetingOperation).containsKey("200"), "200 response"),
                () -> assertTrue(responses(greetingOperation).containsKey("404"), "404 response"),
                () -> assertTrue(responses(greetingOperation).containsKey("500"), "500 response"),
                () -> assertTrue(required(greetingSchema).containsAll(List.of("id", "message")), "required fields"),
                () -> assertEquals(Boolean.TRUE, properties(greetingSchema).get("id").get("readOnly"), "id readOnly")
        );
    }

    @Test
    void in_openApiFile_out_experienceLikeContractDeclared() throws IOException {
        // Given
        Map<String, Object> document = loadYaml(SPEC_PATH);
        Map<String, Object> info = asMap(document.get("info"));

        // When
        Map<String, Object> likeExperience = operation(document, "/experiences/{experienceId}/likes", "post");
        Map<String, Object> unlikeExperience = operation(document, "/experiences/{experienceId}/likes", "delete");
        Map<String, Object> experience = schema(document, "Experience");
        Map<String, Object> like = schema(document, "ExperienceLike");
        Map<String, Object> errorSchema = schema(document, "Error");

        // Then
        assertAll(
                () -> assertEquals("0.29.0", info.get("version"), "info.version"),
                () -> assertTrue(responses(likeExperience).containsKey("201"), "first like returns 201"),
                () -> assertTrue(responses(likeExperience).containsKey("200"), "duplicate like returns 200"),
                () -> assertTrue(responses(likeExperience).containsKey("403"), "self like returns 403"),
                () -> assertTrue(responses(likeExperience).containsKey("404"), "missing experience returns 404"),
                () -> assertTrue(responses(unlikeExperience).containsKey("204"), "unlike returns 204"),
                () -> assertTrue(responses(unlikeExperience).containsKey("404"), "unlike missing returns 404"),
                () -> assertTrue(
                        required(experience).containsAll(List.of("like_count", "is_liked")),
                        "experience like fields are required"),
                () -> assertEquals("integer", properties(experience).get("like_count").get("type"), "like_count type"),
                () -> assertEquals(0, properties(experience).get("like_count").get("minimum"), "like_count minimum"),
                () -> assertEquals(Boolean.TRUE, properties(experience).get("like_count").get("readOnly"), "like_count readOnly"),
                () -> assertEquals("boolean", properties(experience).get("is_liked").get("type"), "is_liked type"),
                () -> assertEquals(Boolean.TRUE, properties(experience).get("is_liked").get("readOnly"), "is_liked readOnly"),
                () -> assertTrue(
                        required(like).containsAll(List.of("experience_id", "like_count", "is_liked")),
                        "like required fields"),
                () -> assertTrue(
                        enums(properties(errorSchema).get("code")).contains("EXPERIENCE_NOT_FOUND"),
                        "error codes"));
    }

    @Test
    void in_openApiFile_out_userCreditContractDeclared() throws IOException {
        // Given
        Map<String, Object> document = loadYaml(SPEC_PATH);
        Map<String, Object> userProfile = schema(document, "UserProfile");
        Map<String, Object> creditEntry = schema(document, "UserCreditEntry");

        // When
        Map<String, Object> creditScore = asMap(properties(userProfile).get("credit_score"));
        Map<String, Object> creditLevel = asMap(properties(userProfile).get("credit_level"));

        // Then
        assertAll(
                () -> assertTrue(
                        required(userProfile).containsAll(List.of("credit_score", "credit_level")),
                        "credit fields are required"),
                () -> assertTrue(
                        properties(userProfile).containsKey("credit_restricted"),
                        "profile credit_restricted declared"),
                () -> assertTrue(
                        properties(userProfile).containsKey("credit_restriction_reason"),
                        "profile credit_restriction_reason declared"),
                () -> assertTrue(paths(document).containsKey("/users/credits"), "batch credit path declared"),
                () -> assertTrue(
                        required(creditEntry).containsAll(List.of("user_id", "credit_score", "credit_level", "credit_restricted")),
                        "batch credit entry fields"),
                () -> assertEquals("integer", creditScore.get("type"), "credit_score type"),
                () -> assertEquals(0, creditScore.get("minimum"), "credit_score minimum"),
                () -> assertEquals(100, creditScore.get("maximum"), "credit_score maximum"),
                () -> assertEquals(Boolean.TRUE, creditScore.get("readOnly"), "credit_score readOnly"),
                () -> assertEquals("string", creditLevel.get("type"), "credit_level type"),
                () -> assertEquals(
                        List.of("excellent", "good", "fair", "low", "risk"),
                        creditLevel.get("enum"),
                        "credit_level enum"),
                () -> assertEquals(Boolean.TRUE, creditLevel.get("readOnly"), "credit_level readOnly"));
    }

    @Test
    void in_openApiFile_out_tripPlanContractDeclared() throws IOException {
        // Given
        Map<String, Object> document = loadYaml(SPEC_PATH);

        // When
        Map<String, Object> info = asMap(document.get("info"));
        Map<String, Object> getTrips = operation(document, "/trips", "get");
        Map<String, Object> postTrips = operation(document, "/trips", "post");
        Map<String, Object> completeTrip = operation(document, "/trips/{tripId}/complete", "post");
        Map<String, Object> createRequest = schema(document, "TripCreateRequest");
        Map<String, Object> tripPlan = schema(document, "TripPlan");
        Map<String, Object> errorSchema = schema(document, "Error");

        // Then
        assertAll(
                () -> assertEquals("0.29.0", info.get("version"), "info.version"),
                () -> assertTrue(paths(document).containsKey("/users"), "/users declared"),
                () -> assertTrue(paths(document).containsKey("/trips/{tripId}"), "detail path declared"),
                () -> assertTrue(
                        parameterNames(document, getTrips)
                                .containsAll(List.of(
                                        "X-User-Id", "destination_code", "date_from", "date_to", "tags",
                                        "page", "size")),
                        "list query parameters"),
                () -> assertTrue(responses(postTrips).containsKey("201"), "create returns 201"),
                () -> assertTrue(responses(postTrips).containsKey("400"), "create returns 400"),
                () -> assertTrue(responses(completeTrip).containsKey("403"), "complete returns 403"),
                () -> assertTrue(responses(completeTrip).containsKey("409"), "complete returns 409"),
                () -> assertTrue(
                        required(createRequest)
                                .containsAll(List.of("title", "destination_code", "start_date", "end_date", "stops", "capacity")),
                        "create required fields"),
                () -> assertTrue(
                        enums(properties(tripPlan).get("status"))
                                .containsAll(List.of("recruiting", "full", "ongoing", "completed", "cancelled")),
                        "status enum"),
                () -> assertTrue(properties(tripPlan).containsKey("ending_soon"), "ending_soon declared"),
                () -> assertTrue(
                                        enums(properties(errorSchema).get("code"))
                                .containsAll(List.of(
                                        "INVALID_INPUT",
                                        "DEMO_USER_REQUIRED",
                                        "FORBIDDEN",
                                        "TRIP_NOT_FOUND",
                                        "TRIP_NOT_OPEN")),
                        "error codes"),
                () -> assertEquals(Boolean.TRUE, properties(tripPlan).get("status").get("readOnly"), "status readOnly"),
                () -> assertTrue(properties(tripPlan).containsKey("destination_code"), "destination_code declared"),
                () -> assertTrue(properties(tripPlan).containsKey("province_code"), "province_code declared"),
                () -> assertTrue(properties(tripPlan).containsKey("province_name"), "province_name declared"),
                () -> assertTrue(properties(tripPlan).containsKey("travel_mode"), "travel_mode declared"),
                () -> assertEquals(
                        List.of("driving", "bicycling", "transit"),
                        enums(properties(tripPlan).get("travel_mode")),
                        "travel_mode enum"),
                () -> assertTrue(properties(createRequest).containsKey("travel_mode"), "create travel_mode declared"),
                () -> assertEquals(
                        1,
                        asMap(properties(createRequest).get("meeting_areas")).get("maxItems"),
                        "create accepts a single meeting area"),
                () -> assertEquals(
                        1,
                        asMap(properties(schema(document, "TripMeetingRequest")).get("meeting_areas")).get("maxItems"),
                        "meeting update accepts a single meeting area")
        );
    }

    @Test
    void in_openApiFile_out_weatherContractDeclared() throws IOException {
        // Given
        Map<String, Object> document = loadYaml(SPEC_PATH);

        // When
        Map<String, Object> forecast = operation(document, "/weather/forecast", "get");
        Map<String, Object> clearCache = operation(document, "/weather/cache", "delete");
        Map<String, Object> forecastSchema = schema(document, "WeatherForecast");
        Map<String, Object> dailySchema = schema(document, "WeatherDaily");
        Map<String, Object> reminderSchema = schema(document, "WeatherReminder");
        Map<String, Object> errorSchema = schema(document, "Error");

        // Then
        assertAll(
                () -> assertTrue(paths(document).containsKey("/weather/forecast"), "weather path declared"),
                () -> assertTrue(
                        parameterNames(document, forecast)
                                .containsAll(List.of("destination_code", "date", "lng", "lat", "refresh")),
                        "weather query parameters"),
                () -> assertTrue(responses(forecast).containsKey("200"), "weather returns 200"),
                () -> assertTrue(responses(forecast).containsKey("400"), "weather returns 400"),
                () -> assertTrue(responses(forecast).containsKey("502"), "weather returns 502"),
                () -> assertTrue(
                        paths(document).containsKey("/weather/cache"), "weather cache clear path declared"),
                () -> assertTrue(responses(clearCache).containsKey("200"), "weather cache clear returns 200"),
                () -> assertTrue(
                        required(forecastSchema).containsAll(List.of("date", "available", "reminders", "source")),
                        "weather required fields"),
                () -> assertTrue(
                        enums(properties(forecastSchema).get("source")).contains("open-meteo"), "weather source enum"),
                () -> assertTrue(
                        required(dailySchema).containsAll(List.of("weather_text", "temp_max_c", "temp_min_c")),
                        "daily required fields"),
                () -> assertTrue(properties(dailySchema).containsKey("uv_index"), "daily uv_index declared"),
                () -> assertTrue(
                        enums(properties(reminderSchema).get("code"))
                                .containsAll(List.of("rain", "heat", "uv", "cold", "temperature_gap", "wind", "calm")),
                        "reminder code enum"),
                () -> assertTrue(
                        enums(properties(errorSchema).get("code")).contains("WEATHER_UPSTREAM_ERROR"),
                        "weather upstream error code"));
    }

    @Test
    void in_openApiFile_out_creditExitContractDeclared() throws IOException {
        // Given
        Map<String, Object> document = loadYaml(SPEC_PATH);
        Map<String, Object> preview = operation(document, "/trips/{tripId}/leave-preview", "get");
        Map<String, Object> leave = operation(document, "/trips/{tripId}/leave", "post");
        Map<String, Object> evidenceUpload = operation(document, "/trips/{tripId}/leave-evidence", "post");
        Map<String, Object> leaveRecord = operation(document, "/trips/{tripId}/leave-record", "get");
        Map<String, Object> leaveEvidenceOperation = operation(document, "/leave-evidence/{attachmentId}", "get");
        Map<String, Object> recordSchema = schema(document, "LeaveRecord");
        Map<String, Object> recordAttachment = schema(document, "LeaveRecordAttachment");
        Map<String, Object> leaveRequest = schema(document, "LeaveRequest");
        Map<String, Object> leaveEvidence = schema(document, "LeaveEvidence");
        Map<String, Object> previewSchema = schema(document, "LeavePreview");
        Map<String, Object> leaveResult = schema(document, "LeaveResult");
        Map<String, Map<String, Object>> tripDetailProps = allOfProperties(document, "TripDetail");

        // Then
        assertAll(
                () -> assertTrue(responses(preview).containsKey("200"), "preview 200"),
                () -> assertTrue(responses(preview).containsKey("400"), "preview 400"),
                () -> assertTrue(responses(preview).containsKey("403"), "preview 403"),
                () -> assertTrue(responses(leave).containsKey("200"), "leave 200"),
                () -> assertTrue(responses(leave).containsKey("409"), "leave 409"),
                () -> assertTrue(responses(evidenceUpload).containsKey("201"), "evidence upload 201"),
                () -> assertTrue(responses(leaveRecord).containsKey("200"), "leave record 200"),
                () -> assertTrue(responses(leaveRecord).containsKey("404"), "leave record 404"),
                () -> assertTrue(responses(leaveEvidenceOperation).containsKey("200"), "leave evidence 200"),
                () -> assertTrue(responses(leaveEvidenceOperation).containsKey("403"), "leave evidence 403"),
                () -> assertTrue(
                        required(recordSchema).containsAll(List.of(
                                "reason", "exit_at", "review_status", "theoretical_delta",
                                "applied_delta", "monthly_ordinal", "attachments")),
                        "leave record required fields"),
                () -> assertTrue(
                        required(recordAttachment).containsAll(List.of("id", "content_type", "size_bytes", "url")),
                        "leave record attachment required fields"),
                () -> assertTrue(
                        properties(leaveRequest).containsKey("note")
                                && Integer.valueOf(200).equals(properties(leaveRequest).get("note").get("maxLength")),
                        "leave note max 200"),
                () -> assertTrue(
                        Integer.valueOf(3).equals(properties(leaveRequest).get("attachment_ids").get("maxItems")),
                        "leave attachments max 3"),
                () -> assertTrue(
                        required(leaveEvidence).containsAll(List.of("id", "content_type", "size_bytes")),
                        "leave evidence required fields"),
                () -> assertTrue(
                        required(previewSchema).containsAll(List.of(
                                "reason", "departure_at", "penalty_tier", "applied_delta",
                                "monthly_ordinal", "resulting_score", "message_code")),
                        "preview required fields"),
                () -> assertTrue(
                        required(leaveResult).containsAll(List.of(
                                "credit_score", "credit_level", "credit_restricted",
                                "applied_delta", "review_status", "message_code")),
                        "leave result required fields"),
                () -> assertTrue(
                        enums(tripDetailProps.get("cancel_reason")).contains("credit_restricted"),
                        "TripDetail cancel_reason system enum"));
    }

    @Test
    void in_openApiFile_out_authContractDeclared() throws IOException {
        // Given
        Map<String, Object> document = loadYaml(SPEC_PATH);

        // When
        Map<String, Object> register = schema(document, "AuthRegisterRequest");
        Map<String, Object> session = schema(document, "AuthSession");

        // Then
        assertAll(
                () -> assertTrue(paths(document).containsKey("/auth/register"), "/auth/register declared"),
                () -> assertTrue(paths(document).containsKey("/auth/login"), "/auth/login declared"),
                () -> assertTrue(paths(document).containsKey("/auth/me"), "/auth/me declared"),
                () -> assertTrue(paths(document).containsKey("/auth/logout"), "/auth/logout declared"),
                () -> assertTrue(
                        required(register).containsAll(List.of("username", "password", "nickname")),
                        "register required fields"),
                () -> assertTrue(
                        properties(register).containsKey("email"),
                        "register accepts optional email"),
                () -> assertTrue(
                        required(register).stream()
                                .noneMatch(List.of("school", "bio", "interests", "avatar_initial")::contains),
                        "register drops legacy profile fields from required"),
                () -> assertTrue(
                        properties(register).keySet().stream()
                                .noneMatch(List.of("school", "bio", "interests", "avatar_initial")::contains),
                        "register drops legacy profile properties"),
                () -> assertTrue(
                        required(session).containsAll(List.of("token", "expires_at", "user")),
                        "session required fields")
        );
    }

    @Test
    void in_openApiFile_out_userProfileContractDeclared() throws IOException {
        // Given
        Map<String, Object> document = loadYaml(SPEC_PATH);

        // When
        Map<String, Object> demoUser = schema(document, "DemoUser");
        Map<String, Object> profile = schema(document, "UserProfile");
        Map<String, Object> updateRequest = schema(document, "UserProfileUpdateRequest");
        Map<String, Object> profileStats = schema(document, "ProfileStats");
        Map<String, Object> errorSchema = schema(document, "Error");

        // Then
        assertAll(
                () -> assertTrue(paths(document).containsKey("/users/{userId}/profile"), "profile read declared"),
                () -> assertTrue(paths(document).containsKey("/users/me/profile"), "profile save declared"),
                () -> assertTrue(paths(document).containsKey("/users/me/avatar"), "avatar upload declared"),
                () -> assertTrue(paths(document).containsKey("/users/{userId}/avatar"), "avatar read declared"),
                () -> assertTrue(
                        required(demoUser).containsAll(
                                List.of("id", "nickname", "avatar_initial", "bio", "interests", "profile_complete",
                                        "role", "status")),
                        "demo user required fields"),
                () -> assertTrue(
                        properties(demoUser).keySet().containsAll(List.of("avatar_url", "city", "major", "job")),
                        "demo user summary fields"),
                () -> assertTrue(
                        properties(profile).keySet().containsAll(List.of(
                                "status", "ban_reason_code", "ban_expires_at")),
                        "profile exposes account status and ban fields"),
                () -> assertTrue(
                        properties(profile).keySet().stream().noneMatch(
                                List.of("status_reason", "ban_reason_note")::contains),
                        "profile hides admin-only penalty notes"),
                () -> assertTrue(
                        properties(demoUser).keySet().contains("school")
                                && required(demoUser).stream().noneMatch("school"::equals),
                        "demo user keeps school but no longer requires it"),
                () -> assertTrue(
                        required(profile).containsAll(
                                List.of("id", "nickname", "avatar_initial", "interests", "profile_complete")),
                        "profile required fields"),
                () -> assertTrue(
                        properties(profile).keySet().containsAll(List.of(
                                "avatar_url", "birthday", "age", "zodiac", "gender", "city", "school", "major", "job",
                                "mbti", "travel_style", "bio", "joined_at", "stats",
                                "route_completion_state", "route_completion_rate")),
                        "profile derived and optional fields"),
                () -> assertTrue(
                        required(profile).containsAll(List.of("route_completion_state")),
                        "route completion state is required"),
                () -> assertTrue(
                        required(profile).stream().noneMatch(List.of("joined_at", "stats", "route_completion_rate")::contains),
                        "joined_at, stats and route_completion_rate are optional"),
                () -> assertTrue(
                        enums(properties(profile).get("route_completion_state")).containsAll(
                                List.of("good", "neutral", "watch", "insufficient")),
                        "route completion state enum"),
                () -> assertTrue(
                        required(profileStats).containsAll(List.of("published", "completed", "joined", "shared")),
                        "profile stats fields"),
                () -> assertTrue(
                        required(updateRequest).containsAll(
                                List.of("nickname", "birthday", "gender", "city", "interests", "travel_style")),
                        "update request required fields"),
                () -> assertTrue(
                        enums(properties(updateRequest).get("gender")).containsAll(List.of("男", "女", "其他")),
                        "gender enum"),
                () -> assertEquals(
                        20,
                        asMap(properties(updateRequest).get("job")).get("maxLength"),
                        "job accepts custom text up to 20 chars"),
                () -> assertEquals(
                        20,
                        asMap(properties(profile).get("job")).get("maxLength"),
                        "profile job max length"),
                () -> assertTrue(
                        enums(properties(updateRequest).get("travel_style"))
                                .containsAll(List.of("特种兵", "休闲游", "深度游", "随性游")),
                        "travel style enum"),
                () -> assertEquals(16, enums(properties(updateRequest).get("mbti")).size(), "mbti enum size"),
                () -> assertEquals(3, properties(updateRequest).get("interests").get("minItems"), "min interests"),
                () -> assertEquals(5, properties(updateRequest).get("interests").get("maxItems"), "max interests"),
                () -> assertTrue(
                        enums(properties(errorSchema).get("code")).contains("USER_NOT_FOUND"),
                        "user not found error code"),
                () -> assertEquals("object", properties(errorSchema).get("fields").get("type"), "error fields object"),
                () -> assertTrue(
                        enums(asMap(properties(errorSchema).get("fields").get("additionalProperties")))
                                .containsAll(List.of("REQUIRED", "INVALID_DATE", "INVALID_OPTION")),
                        "field reason codes")
        );
    }

    @Test
    void in_openApiFile_out_companionContractDeclared() throws IOException {
        // Given
        Map<String, Object> document = loadYaml(SPEC_PATH);

        // When
        Map<String, Object> postApplications = operation(document, "/trips/{tripId}/applications", "post");
        Map<String, Object> postMessages = operation(document, "/trips/{tripId}/messages", "post");
        Map<String, Object> application = schema(document, "TripApplication");
        Map<String, Object> myTrips = schema(document, "MyTrips");
        Map<String, Object> pendingApplicationCount = schema(document, "PendingApplicationCount");
        Map<String, Object> reportRequest = schema(document, "ReportRequest");
        Map<String, Object> errorSchema = schema(document, "Error");

        // Then
        assertAll(
                () -> assertTrue(paths(document).containsKey("/me/trips"), "/me/trips declared"),
                () -> assertTrue(responses(postApplications).containsKey("201"), "apply returns 201"),
                () -> assertTrue(responses(postMessages).containsKey("409"), "chat read-only conflict"),
                () -> assertTrue(
                        enums(properties(application).get("status"))
                                .containsAll(List.of("pending", "accepted", "rejected", "cancelled", "left")),
                        "application status enum"),
                () -> assertTrue(
                        required(myTrips)
                                .containsAll(List.of(
                                        "published", "applied", "matched", "completed", "pending_application_count")),
                        "my trips groups"),
                () -> assertTrue(
                        properties(myTrips).containsKey("pending_applications"),
                        "my trips per-trip pending counts"),
                () -> assertFalse(
                        required(myTrips).contains("pending_applications"),
                        "pending_applications stays optional"),
                () -> assertTrue(
                        required(pendingApplicationCount).containsAll(List.of("trip_id", "count")),
                        "pending application count fields"),
                () -> assertEquals(
                        Integer.valueOf(1),
                        properties(pendingApplicationCount).get("count").get("minimum"),
                        "pending count minimum"),
                () -> assertTrue(
                        enums(properties(reportRequest).get("reason"))
                                .containsAll(List.of("harassment", "fake", "safety", "other")),
                        "report reasons"),
                () -> assertTrue(
                        enums(properties(reportRequest).get("target_type"))
                                .containsAll(List.of("trip", "user", "experience")),
                        "report target types"),
                () -> assertTrue(
                        enums(properties(errorSchema).get("code"))
                                .containsAll(List.of(
                                        "APPLICATION_NOT_FOUND",
                                        "APPLICATION_NOT_PENDING",
                                        "DUPLICATE_APPLICATION",
                                        "CHAT_NOT_ALLOWED",
                                        "CHAT_READ_ONLY")),
                        "companion error codes")
        );
    }

    @Test
    void in_openApiFile_out_experienceContractDeclared() throws IOException {
        // Given
        Map<String, Object> document = loadYaml(SPEC_PATH);

        // When
        Map<String, Object> getExperiences = operation(document, "/experiences", "get");
        Map<String, Object> postExperience = operation(document, "/trips/{tripId}/experiences", "post");
        Map<String, Object> uploadPhoto = operation(document, "/trips/{tripId}/experiences/photos", "post");
        Map<String, Object> loadPhoto = operation(document, "/experience-photos/{photoId}", "get");
        Map<String, Object> writeRequest = schema(document, "ExperienceWriteRequest");
        Map<String, Object> experience = schema(document, "Experience");
        Map<String, Object> experiencePhoto = schema(document, "ExperiencePhoto");
        Map<String, Object> tripPlan = schema(document, "TripPlan");
        Map<String, Object> errorSchema = schema(document, "Error");

        // Then
        assertAll(
                () -> assertTrue(paths(document).containsKey("/me/experiences"), "/me/experiences declared"),
                () -> assertTrue(
                        responses(postExperience).containsKey("201")
                                && responses(postExperience).containsKey("200"),
                        "experience create/update statuses"),
                () -> assertTrue(
                        parameterNames(document, getExperiences)
                                .containsAll(List.of(
                                        "X-User-Id", "destination_code", "date_from", "date_to", "tags",
                                        "page", "size")),
                        "experience query parameters"),
                () -> assertTrue(
                        required(writeRequest).containsAll(List.of("content", "intensity", "advice")),
                        "experience write required fields"),
                () -> assertTrue(
                        enums(properties(writeRequest).get("intensity"))
                                .containsAll(List.of("relaxed", "moderate", "tiring")),
                        "intensity enum"),
                () -> assertTrue(
                        required(experience)
                                .containsAll(List.of("id", "trip", "author", "content", "intensity", "advice", "photos")),
                        "experience required fields"),
                () -> assertTrue(
                        properties(experience).containsKey("photos"),
                        "experience photos field"),
                () -> assertTrue(
                        required(experiencePhoto).containsAll(List.of("id", "url")),
                        "experience photo fields"),
                () -> assertTrue(
                        properties(writeRequest).containsKey("photo_ids"),
                        "experience write photo_ids"),
                () -> assertEquals(
                        6, asMap(properties(writeRequest).get("photo_ids")).get("maxItems"),
                        "photo_ids maxItems"),
                () -> assertTrue(
                        responses(uploadPhoto).containsKey("400")
                                && responses(uploadPhoto).containsKey("401")
                                && responses(uploadPhoto).containsKey("403"),
                        "photo upload error statuses"),
                () -> assertTrue(responses(loadPhoto).containsKey("404"), "photo read 404"),
                () -> assertFalse(
                        asMap(paths(document).get("/trips/{tripId}/experiences")).containsKey("delete"),
                        "no experience delete endpoint"),
                () -> assertFalse(
                        properties(tripPlan).containsKey("photos"),
                        "trip plan keeps no photos"),
                () -> assertTrue(
                        enums(properties(errorSchema).get("code")).contains("EXPERIENCE_NOT_ALLOWED"),
                        "experience error code")
        );
    }

    @Test
    void in_openApiFile_out_tripMeetingContractDeclared() throws IOException {
        // Given
        Map<String, Object> document = loadYaml(SPEC_PATH);

        // When
        Map<String, Object> putMeeting = operation(document, "/trips/{tripId}/meeting", "put");
        Map<String, Object> meetingRequest = schema(document, "TripMeetingRequest");
        Map<String, Map<String, Object>> tripPlanProperties = properties(schema(document, "TripPlan"));
        Map<String, Map<String, Object>> tripDetailProperties = allOfProperties(document, "TripDetail");
        Map<String, Map<String, Object>> createProperties = properties(schema(document, "TripCreateRequest"));

        // Then
        assertAll(
                () -> assertTrue(responses(putMeeting).containsKey("200"), "meeting update returns 200"),
                () -> assertTrue(responses(putMeeting).containsKey("400"), "meeting update returns 400"),
                () -> assertTrue(responses(putMeeting).containsKey("403"), "meeting update returns 403"),
                () -> assertTrue(responses(putMeeting).containsKey("409"), "meeting update returns 409"),
                () -> assertTrue(
                        properties(meetingRequest).keySet().containsAll(List.of("meeting_areas", "meeting_time")),
                        "meeting request fields"),
                () -> assertTrue(tripPlanProperties.containsKey("meeting_areas"), "trip plan meeting_areas"),
                () -> assertTrue(!tripPlanProperties.containsKey("meeting_area"), "trip plan meeting_area removed"),
                () -> assertEquals(3, tripPlanProperties.get("meeting_areas").get("maxItems"), "meeting_areas maxItems"),
                () -> assertTrue(tripPlanProperties.containsKey("meeting_time"), "trip plan meeting_time"),
                () -> assertTrue(tripDetailProperties.containsKey("meeting_areas"), "trip detail meeting_areas"),
                () -> assertTrue(tripDetailProperties.containsKey("meeting_time"), "trip detail meeting_time"),
                () -> assertTrue(createProperties.containsKey("meeting_areas"), "create request meeting_areas"),
                () -> assertTrue(createProperties.containsKey("meeting_time"), "create request meeting_time")
        );
    }

    @Test
    void in_openApiFile_out_tripCancellationContractDeclared() throws IOException {
        // Given
        Map<String, Object> document = loadYaml(SPEC_PATH);

        // When
        Map<String, Object> cancelTrip = operation(document, "/trips/{tripId}/cancel", "post");
        Map<String, Object> cancelRequest = schema(document, "TripCancelRequest");
        Map<String, Map<String, Object>> tripDetailProperties = allOfProperties(document, "TripDetail");

        // Then
        assertAll(
                () -> assertTrue(responses(cancelTrip).containsKey("200"), "cancel returns 200"),
                () -> assertTrue(responses(cancelTrip).containsKey("400"), "cancel returns 400"),
                () -> assertTrue(responses(cancelTrip).containsKey("403"), "cancel returns 403"),
                () -> assertTrue(responses(cancelTrip).containsKey("409"), "cancel returns 409"),
                () -> assertTrue(
                        parameterNames(document, cancelTrip).containsAll(List.of("X-User-Id", "tripId")),
                        "cancel parameters"),
                () -> assertTrue(required(cancelRequest).contains("reason"), "cancel reason required"),
                () -> assertEquals(
                        8, enums(properties(cancelRequest).get("reason")).size(), "cancel reason enum size"),
                () -> assertTrue(
                        enums(properties(cancelRequest).get("reason")).containsAll(List.of(
                                "personal", "time_changed", "plan_changed", "not_enough_people",
                                "weather", "illness", "safety", "other")),
                        "cancel reason enum"),
                () -> assertEquals(
                        100, properties(cancelRequest).get("note").get("maxLength"), "cancel note maxLength"),
                () -> assertTrue(tripDetailProperties.containsKey("cancelled_at"), "cancelled_at declared"),
                () -> assertTrue(tripDetailProperties.containsKey("cancel_reason"), "cancel_reason declared"),
                () -> assertTrue(tripDetailProperties.containsKey("cancel_note"), "cancel_note declared"),
                () -> assertEquals(
                        Boolean.TRUE, tripDetailProperties.get("cancel_reason").get("readOnly"),
                        "cancel_reason readOnly")
        );
    }

    @Test
    void in_openApiFile_out_aiItineraryContractDeclared() throws IOException {
        // Given
        Map<String, Object> document = loadYaml(SPEC_PATH);

        // When
        Map<String, Object> generate = operation(document, "/ai/itineraries/generate", "post");
        Map<String, Object> saveSnapshot = operation(document, "/ai/itineraries", "post");
        Map<String, Object> readSnapshot = operation(document, "/ai/itineraries/{id}", "get");
        Map<String, Object> generateRequest = schema(document, "AiGenerateRequest");
        Map<String, Object> plan = schema(document, "AiPlan");
        Map<String, Object> planStop = schema(document, "AiPlanStop");
        Map<String, Object> weather = schema(document, "WeatherForecast");
        Map<String, Object> snapshot = schema(document, "AiItinerarySnapshot");
        Map<String, Object> budget = schema(document, "AiBudget");
        Map<String, Object> createRequest = schema(document, "TripCreateRequest");
        Map<String, Object> tripPlan = schema(document, "TripPlan");
        Map<String, Map<String, Object>> tripDetailProperties = allOfProperties(document, "TripDetail");
        Map<String, Object> errorSchema = schema(document, "Error");

        // Then
        assertAll(
                () -> assertTrue(responses(generate).containsKey("200"), "generate returns 200"),
                () -> assertTrue(responses(generate).containsKey("400"), "generate returns 400"),
                () -> assertTrue(responses(generate).containsKey("502"), "generate returns 502"),
                () -> assertTrue(responses(generate).containsKey("503"), "generate returns 503"),
                () -> assertTrue(responses(saveSnapshot).containsKey("201"), "snapshot save returns 201"),
                () -> assertTrue(responses(saveSnapshot).containsKey("400"), "snapshot save returns 400"),
                () -> assertTrue(responses(readSnapshot).containsKey("200"), "snapshot read returns 200"),
                () -> assertTrue(responses(readSnapshot).containsKey("400"), "snapshot read returns 400"),
                () -> assertTrue(
                        required(generateRequest).containsAll(List.of("origin", "destination", "date")),
                        "generate required fields"),
                () -> assertTrue(
                        enums(properties(generateRequest).get("duration"))
                                .containsAll(List.of("half_day", "one_day", "two_day")),
                        "duration enum"),
                () -> assertTrue(
                        enums(properties(generateRequest).get("travel_mode"))
                                .containsAll(List.of("transit", "walking", "driving")),
                        "travel mode enum"),
                () -> assertTrue(
                        enums(properties(generateRequest).get("pace"))
                                .containsAll(List.of("relaxed", "moderate", "compact")),
                        "pace enum"),
                () -> assertTrue(
                        required(plan).containsAll(List.of("title", "days", "tips", "packing", "budget")),
                        "plan required fields"),
                () -> assertTrue(
                        required(planStop)
                                .containsAll(List.of("name", "reason", "arrival", "stay_minutes", "indoor")),
                        "plan stop required fields"),
                () -> assertTrue(
                        properties(planStop).keySet().stream()
                                .noneMatch(List.of("lng", "lat", "distance", "duration")::contains),
                        "plan stops must not carry map data"),
                () -> assertTrue(
                        required(weather).containsAll(List.of("date", "available", "reminders", "source")),
                        "weather required fields (add-trip-weather contract)"),
                () -> assertTrue(
                        required(snapshot)
                                .containsAll(List.of("origin", "destination", "date", "stops", "travel_mode")),
                        "snapshot required fields"),
                () -> assertTrue(
                        required(budget).containsAll(List.of(
                                "transport_cents", "tickets_cents", "food_cents", "other_cents", "total_cents")),
                        "budget required fields"),
                () -> assertTrue(properties(createRequest).containsKey("ai_itinerary_id"), "create ai link"),
                () -> assertFalse(required(createRequest).contains("ai_itinerary_id"), "ai link stays optional"),
                () -> assertEquals(
                        Boolean.TRUE,
                        properties(createRequest).get("ai_itinerary_id").get("nullable"),
                        "create ai link nullable"),
                () -> assertTrue(properties(tripPlan).containsKey("ai_itinerary_id"), "trip plan ai link"),
                () -> assertEquals(
                        Boolean.TRUE,
                        properties(tripPlan).get("ai_itinerary_id").get("nullable"),
                        "trip plan ai link nullable"),
                () -> assertTrue(tripDetailProperties.containsKey("ai_itinerary_id"), "trip detail ai link"),
                () -> assertTrue(
                        enums(properties(errorSchema).get("code")).containsAll(List.of(
                                "AI_NOT_CONFIGURED", "AI_UPSTREAM_ERROR", "AI_INVALID_OUTPUT",
                                "WEATHER_UPSTREAM_ERROR")),
                        "ai / weather error codes")
        );
    }

    @Test
    void in_openApiFile_out_adminConsoleContractDeclared() throws IOException {
        // Given
        Map<String, Object> document = loadYaml(SPEC_PATH);

        // When
        Map<String, Object> info = asMap(document.get("info"));
        Map<String, Object> errorSchema = schema(document, "Error");
        Map<String, Object> demoUser = schema(document, "DemoUser");
        Map<String, Object> adminUserDetail = schema(document, "AdminUserDetail");
        Map<String, Object> adminReportSummary = schema(document, "AdminReportSummary");
        Map<String, Object> adminReportContext = schema(document, "AdminReportContext");
        Map<String, Object> adminReportMessage = schema(document, "AdminReportMessage");
        Map<String, Object> reportRequest = schema(document, "ReportRequest");
        Map<String, Object> serviceSessionSummary = schema(document, "ServiceSessionSummary");
        Map<String, Map<String, Object>> adminReportDetail = allOfProperties(document, "AdminReportDetail");
        long adminOperations = ADMIN_CONSOLE_PATHS.stream()
                .map(path -> asMap(paths(document).get(path)))
                .mapToLong(item -> item.keySet().stream().filter(HTTP_METHODS::contains).count())
                .sum();

        // Then
        assertAll(
                () -> assertEquals("0.29.0", info.get("version"), "info.version"),
                () -> assertTrue(paths(document).keySet().containsAll(ADMIN_CONSOLE_PATHS), "admin console paths"),
                () -> assertEquals(17L, adminOperations, "admin console operations"),
                () -> assertTrue(
                        ADMIN_CONSOLE_PATHS.stream()
                                .map(path -> asMap(paths(document).get(path)))
                                .noneMatch(item -> item.containsKey("delete")),
                        "no DELETE operations in admin console paths"),
                () -> assertTrue(
                        parameterNames(document, operation(document, "/admin/users", "get"))
                                .contains("Authorization"),
                        "admin endpoints require bearer"),
                () -> assertTrue(
                        parameterNames(document, operation(document, "/help/reports", "get"))
                                .contains("Authorization"),
                        "help endpoints use bearer"),
                () -> assertTrue(
                        parameterNames(document, operation(document, "/service/sessions", "post"))
                                .contains("Authorization"),
                        "service endpoints use bearer"),
                () -> assertEquals(List.of("USER", "ADMIN"), enums(schema(document, "AccountRole")), "account roles"),
                () -> assertEquals(
                        List.of("ACTIVE", "SUSPENDED", "BANNED"),
                        enums(schema(document, "AccountStatus")),
                        "account statuses"),
                () -> assertEquals(
                        List.of("HARASSMENT", "FAKE_TRIP", "FRAUD_RISK", "ILLEGAL_CONTENT",
                                "IMPERSONATION", "NO_SHOW_DISRUPTION", "PRIVACY_LEAK", "OTHER"),
                        enums(schema(document, "BanReason")),
                        "ban reasons"),
                () -> assertEquals(
                        List.of("PENDING", "PROCESSING", "RESOLVED", "REJECTED"),
                        enums(schema(document, "ReportStatus")),
                        "report statuses"),
                () -> assertEquals(
                        List.of("SUSPEND", "BAN", "KEEP", "UPDATE_BAN", "REJECT"),
                        enums(schema(document, "ReportResolutionAction")),
                        "resolution actions"),
                () -> assertEquals(
                        List.of("WAITING", "HANDLING", "CLOSED"),
                        enums(schema(document, "ServiceSessionStatus")),
                        "service session statuses"),
                () -> assertTrue(
                        required(adminUserDetail).containsAll(List.of(
                                "id", "nickname", "avatar_initial", "role", "status", "created_at",
                                "trips", "experiences", "reports",
                                "trip_total", "experience_total", "report_total")),
                        "admin user detail required fields"),
                () -> assertTrue(
                        required(adminReportSummary).containsAll(List.of(
                                "id", "code", "target_type", "target_id", "reason", "created_at", "status")),
                        "admin report summary required fields"),
                () -> assertTrue(adminReportDetail.containsKey("target"), "admin report detail target"),
                () -> assertTrue(
                        adminReportDetail.containsKey("context")
                                && required(adminReportContext).containsAll(List.of("origin", "messages"))
                                && required(adminReportMessage).containsAll(
                                        List.of("id", "sender", "receiver", "content", "sent_at"))
                                && enums(properties(adminReportContext).get("origin"))
                                        .containsAll(List.of("chat", "trip")),
                        "admin report detail origin context"),
                () -> assertTrue(
                        properties(reportRequest).containsKey("trip_id")
                                && !required(reportRequest).contains("trip_id"),
                        "report request carries optional chat trip id"),
                () -> assertTrue(
                        adminReportDetail.containsKey("resolution_note")
                                && adminReportDetail.containsKey("resolution_action"),
                        "admin report detail resolution"),
                () -> assertTrue(
                        required(serviceSessionSummary).containsAll(
                                List.of("id", "user", "status", "created_at", "message_count")),
                        "service session summary required fields"),
                () -> assertTrue(
                        required(demoUser).containsAll(List.of("role", "status")),
                        "demo user carries role and status"),
                () -> assertTrue(
                        enums(properties(errorSchema).get("code")).containsAll(List.of(
                                "ADMIN_REQUIRED", "ACCOUNT_SUSPENDED", "ACCOUNT_BANNED",
                                "INVALID_STATUS_TRANSITION", "CANNOT_TARGET_SELF", "USER_NOT_FOUND",
                                "REPORT_NOT_FOUND", "REPORT_NOT_PENDING", "REPORT_NOT_PROCESSING",
                                "EMAIL_TAKEN", "SESSION_ALREADY_HANDLING", "SESSION_NOT_HANDLING",
                                "SESSION_CLOSED")),
                        "admin console error codes")
        );
    }

    @Test
    void in_openApiFile_out_adminExperienceDeleteDeclared() throws IOException {
        // Given
        Map<String, Object> document = loadYaml(SPEC_PATH);

        // When
        Map<String, Object> deleteExperience =
                operation(document, "/admin/experiences/{experienceId}", "delete");

        // Then
        assertAll(
                () -> assertEquals("deleteAdminExperience", deleteExperience.get("operationId"),
                        "operationId"),
                () -> assertTrue(
                        parameterNames(document, deleteExperience).containsAll(
                                List.of("Authorization", "experienceId")),
                        "admin bearer + path id"),
                () -> assertTrue(
                        responses(deleteExperience).keySet().containsAll(
                                List.of("204", "401", "403", "404", "500")),
                        "delete status codes")
        );
    }

    @Test
    void in_openApiFile_out_creditRecoveryContractDeclared() throws IOException {
        // Given
        Map<String, Object> document = loadYaml(SPEC_PATH);

        // When
        Map<String, Object> startSession = operation(document, "/credit/learning/sessions", "post");
        Map<String, Object> completeLessons =
                operation(document, "/credit/learning/sessions/{sessionId}/lessons/complete", "post");
        Map<String, Object> submitAnswers =
                operation(document, "/credit/learning/sessions/{sessionId}/submission", "post");
        Map<String, Object> postTrips = operation(document, "/trips", "post");
        Map<String, Object> question = schema(document, "LearningQuestion");
        Map<String, Object> session = schema(document, "LearningSession");
        Map<String, Object> result = schema(document, "LearningResult");
        Map<String, Object> answerDetail = schema(document, "LearningAnswerDetail");
        Map<String, Object> errorSchema = schema(document, "Error");

        // Then
        assertAll(
                () -> assertEquals("0.29.0", asMap(document.get("info")).get("version"), "info.version"),
                () -> assertTrue(responses(startSession).containsKey("201"), "session start returns 201"),
                () -> assertTrue(
                        responses(startSession).keySet().containsAll(List.of("401", "404", "409", "429")),
                        "session start error statuses"),
                () -> assertTrue(responses(completeLessons).containsKey("200"), "lessons complete returns 200"),
                () -> assertTrue(
                        responses(completeLessons).keySet().containsAll(List.of("401", "404")),
                        "lessons complete error statuses"),
                () -> assertTrue(responses(submitAnswers).containsKey("200"), "submission returns 200"),
                () -> assertTrue(
                        responses(submitAnswers).keySet().containsAll(List.of("400", "401", "404", "409")),
                        "submission error statuses"),
                () -> assertTrue(
                        parameterNames(document, startSession).contains("X-User-Id"),
                        "session start identity header"),
                () -> assertTrue(
                        parameterNames(document, completeLessons).containsAll(List.of("X-User-Id", "sessionId")),
                        "lessons complete parameters"),
                () -> assertTrue(
                        parameterNames(document, submitAnswers).containsAll(List.of("X-User-Id", "sessionId")),
                        "submission parameters"),
                () -> assertTrue(responses(postTrips).containsKey("403"), "trip create returns 403"),
                () -> assertTrue(
                        required(question).containsAll(List.of("id", "category", "question", "options")),
                        "learning question fields"),
                () -> assertEquals(4, asMap(properties(question).get("options")).get("minItems"), "options size"),
                () -> assertFalse(
                        properties(question).keySet().stream()
                                .anyMatch(name -> name.contains("answer") || name.contains("correct")),
                        "question leaks no answer"),
                () -> assertTrue(
                        required(session).containsAll(List.of(
                                "session_id", "questions", "exam_used", "exam_limit", "month", "learning_completed")),
                        "learning session fields"),
                () -> assertTrue(
                        required(result).containsAll(List.of(
                                "session_id", "passed", "score", "pass_line", "details",
                                "recovery_applied", "credit_score", "credit_level")),
                        "learning result fields"),
                () -> assertTrue(
                        required(answerDetail).containsAll(List.of("question_id", "correct")),
                        "answer detail fields"),
                () -> assertFalse(
                        properties(answerDetail).keySet().stream()
                                .anyMatch(name -> name.contains("answer") || name.contains("correct_answer")),
                        "answer detail leaks no correct answer"),
                () -> assertTrue(
                        enums(properties(errorSchema).get("code")).containsAll(List.of(
                                "CREDIT_RESTRICTED",
                                "LEARNING_NOT_ELIGIBLE",
                                "LEARNING_EXAM_QUOTA_EXCEEDED",
                                "LEARNING_RECOVERY_QUOTA_EXCEEDED",
                                "LEARNING_NOT_COMPLETED",
                                "LEARNING_SESSION_NOT_FOUND")),
                        "credit recovery error codes")
        );
    }

    @Test
    void in_openApiFile_out_adminDashboardContractDeclared() throws IOException {
        // Given
        Map<String, Object> document = loadYaml(SPEC_PATH);

        // When
        Map<String, Object> dashboard = operation(document, "/admin/dashboard", "get");
        Map<String, Object> dashboardSchema = schema(document, "AdminDashboard");
        Map<String, Map<String, Object>> dashboardProperties = properties(dashboardSchema);
        Map<String, Object> ok = asMap(responses(dashboard).get("200"));
        Map<String, Object> cacheControl = asMap(asMap(ok.get("headers")).get("Cache-Control"));
        Map<String, Object> users = schema(document, "AdminDashboardUsers");
        Map<String, Object> trips = schema(document, "AdminDashboardTrips");
        Map<String, Object> applications = schema(document, "AdminDashboardApplications");
        Map<String, Object> experiences = schema(document, "AdminDashboardExperiences");
        Map<String, Object> reports = schema(document, "AdminDashboardReports");
        Map<String, Object> serviceSessions = schema(document, "AdminDashboardServiceSessions");

        // Then
        assertAll(
                () -> assertTrue(
                        parameterNames(document, dashboard).contains("Authorization"),
                        "dashboard requires bearer"),
                () -> assertTrue(responses(dashboard).keySet().containsAll(List.of("200", "401", "403", "500")),
                        "dashboard responses"),
                () -> assertEquals(Boolean.FALSE, dashboardSchema.get("additionalProperties"),
                        "dashboard schema is closed"),
                () -> assertTrue(
                        required(dashboardSchema).containsAll(List.of(
                                "users", "trips", "applications", "experiences", "reports",
                                "service_sessions", "generated_at")),
                        "dashboard required groups"),
                () -> assertTrue(
                        dashboardProperties.get("generated_at").get("format").equals("date-time")
                                && Boolean.TRUE.equals(dashboardProperties.get("generated_at").get("readOnly")),
                        "generated_at is read-only date-time"),
                () -> assertTrue(
                        cacheControl.get("description").toString().contains("no-store"),
                        "dashboard is not cached"),
                () -> assertEquals(
                        required(users),
                        List.of("total", "by_role", "by_status", "new_last_7_days", "new_last_30_days"),
                        "users required fields"),
                () -> assertEquals(
                        required(asMap(properties(users).get("by_role"))),
                        List.of("USER", "ADMIN"),
                        "users role buckets"),
                () -> assertEquals(
                        required(asMap(properties(users).get("by_status"))),
                        List.of("ACTIVE", "SUSPENDED", "BANNED"),
                        "users status buckets"),
                () -> assertEquals(
                        required(trips),
                        List.of("total", "by_status", "new_last_7_days", "new_last_30_days"),
                        "trips required fields"),
                () -> assertEquals(
                        required(asMap(properties(trips).get("by_status"))),
                        List.of("recruiting", "full", "ongoing", "completed", "cancelled"),
                        "trip status buckets"),
                () -> assertEquals(
                        required(applications),
                        List.of("total", "by_status"),
                        "applications required fields"),
                () -> assertEquals(
                        required(asMap(properties(applications).get("by_status"))),
                        List.of("pending", "accepted", "rejected", "cancelled", "left"),
                        "application status buckets"),
                () -> assertEquals(
                        required(experiences),
                        List.of("total", "new_last_7_days", "new_last_30_days"),
                        "experiences required fields"),
                () -> assertEquals(
                        required(reports),
                        List.of("total", "by_status"),
                        "reports required fields"),
                () -> assertEquals(
                        required(asMap(properties(reports).get("by_status"))),
                        List.of("PENDING", "PROCESSING", "RESOLVED", "REJECTED"),
                        "report status buckets"),
                () -> assertEquals(
                        required(serviceSessions),
                        List.of("total", "by_status"),
                        "service sessions required fields"),
                () -> assertEquals(
                        required(asMap(properties(serviceSessions).get("by_status"))),
                        List.of("WAITING", "HANDLING", "CLOSED"),
                        "service session status buckets"),
                () -> assertEquals(0, properties(users).get("total").get("minimum"), "counts are non-negative")
        );
    }

    @Test
    void in_openApiFile_out_travelFinanceContractDeclared() throws IOException {
        // Given
        Map<String, Object> document = loadYaml(SPEC_PATH);

        // When
        Map<String, Object> info = asMap(document.get("info"));
        Map<String, Object> wallet = schema(document, "Wallet");
        Map<String, Object> ledger = schema(document, "WalletLedgerEntry");
        Map<String, Object> policy = schema(document, "InsurancePolicy");
        Map<String, Object> provider = schema(document, "InsuranceProvider");
        Map<String, Object> product = schema(document, "InsuranceProduct");
        Map<String, Object> summary = schema(document, "InsuranceSummary");
        Map<String, Object> redirect = schema(document, "InsuranceRedirect");
        Map<String, Object> loan = schema(document, "TravelLoan");
        Map<String, Object> tripFinance = schema(document, "TripFinance");
        Map<String, Object> myFinance = schema(document, "MyFinance");
        Map<String, Object> loanRequest = schema(document, "LoanCreateRequest");
        Map<String, Object> errorSchema = schema(document, "Error");
        Map<String, Object> purchase = operation(document, "/trips/{tripId}/insurance/purchase", "post");
        Map<String, Object> confirm = operation(document, "/trips/{tripId}/insurance/confirm", "post");
        Map<String, Object> postLoan = operation(document, "/trips/{tripId}/loans", "post");
        Map<String, Object> repay = operation(document, "/loans/{loanId}/repay", "post");

        // Then
        assertAll(
                () -> assertEquals("0.29.0", info.get("version"), "info.version"),
                () -> assertTrue(
                        paths(document).keySet().containsAll(List.of(
                                "/trips/{tripId}/finance",
                                "/trips/{tripId}/insurance/purchase",
                                "/trips/{tripId}/insurance/confirm",
                                "/trips/{tripId}/loans",
                                "/me/finance",
                                "/loans/{loanId}/repay")),
                        "travel finance paths"),
                () -> assertFalse(paths(document).containsKey("/finance/plans"),
                        "no in-app insurance catalog"),
                () -> assertTrue(
                        required(summary).containsAll(List.of(
                                "status", "provider", "products", "purchase_url", "policy")),
                        "insurance summary required fields"),
                () -> assertEquals(
                        List.of("not_purchased", "active", "expired"),
                        enums(properties(summary).get("status")),
                        "insurance status enum"),
                () -> assertEquals(
                        Boolean.TRUE,
                        properties(summary).get("purchase_url").get("nullable"),
                        "purchase_url nullable when ineligible"),
                () -> assertEquals(
                        Boolean.TRUE,
                        properties(summary).get("policy").get("nullable"),
                        "policy nullable before purchase"),
                () -> assertTrue(
                        required(provider).containsAll(List.of(
                                "name", "policy_url", "claim_url", "emergency_url")),
                        "provider required fields"),
                () -> assertTrue(
                        required(product).containsAll(List.of("code", "title", "summary")),
                        "product required fields"),
                () -> assertEquals(
                        List.of("accident_medical", "emergency_rescue", "travel_baggage"),
                        enums(properties(product).get("code")),
                        "product code enum"),
                () -> assertFalse(
                        properties(product).containsKey("premium_cents")
                                || properties(product).containsKey("coverage_cents"),
                        "third-party products carry no price or coverage"),
                () -> assertTrue(required(redirect).contains("redirect_url"), "redirect url required"),
                () -> assertEquals("integer", properties(wallet).get("balance_cents").get("type"), "balance type"),
                () -> assertEquals(0, properties(wallet).get("balance_cents").get("minimum"), "balance minimum"),
                () -> assertTrue(
                        required(ledger).containsAll(List.of(
                                "id", "direction", "amount_cents", "balance_before_cents", "balance_after_cents",
                                "entry_type", "related_type", "related_id", "occurred_at")),
                        "ledger required fields"),
                () -> assertEquals(List.of("credit", "debit"), enums(properties(ledger).get("direction")), "direction"),
                () -> assertEquals(
                        List.of("loan_disbursement", "loan_repayment"),
                        enums(properties(ledger).get("entry_type")),
                        "entry type enum excludes insurance"),
                () -> assertEquals(
                        List.of("travel_loan"),
                        enums(properties(ledger).get("related_type")),
                        "related type enum"),
                () -> assertEquals("string", properties(ledger).get("related_id").get("type"), "related_id string"),
                () -> assertTrue(
                        String.valueOf(properties(myFinance).get("ledger").get("description"))
                                .contains("occurred_at")
                                && String.valueOf(properties(myFinance).get("ledger").get("description"))
                                        .contains("升序"),
                        "ledger ordering documented"),
                () -> assertTrue(
                        required(policy).containsAll(List.of(
                                "id", "trip_id", "provider", "coverage_start", "coverage_end", "status",
                                "confirmed_at")),
                        "policy required fields"),
                () -> assertEquals(List.of("active", "expired"), enums(properties(policy).get("status")), "policy status"),
                () -> assertEquals("date", properties(policy).get("coverage_start").get("format"), "coverage_start date"),
                () -> assertEquals("date", properties(policy).get("coverage_end").get("format"), "coverage_end date"),
                () -> assertFalse(
                        properties(policy).containsKey("policy_no")
                                || properties(policy).containsKey("id_card")
                                || properties(policy).containsKey("premium_cents"),
                        "policy response stores no sensitive or pricing fields"),
                () -> assertEquals(
                        List.of("active", "repaid", "overdue"),
                        enums(properties(loan).get("status")),
                        "loan status enum"),
                () -> assertTrue(
                        required(loan).containsAll(List.of(
                                "interest_cents", "repay_cents", "penalty_cents", "total_repay_cents")),
                        "loan exposes interest, penalty and total repayment"),
                () -> assertEquals(
                        List.of(7, 14, 30),
                        properties(loan).get("term_days").get("enum"),
                        "loan term enum"),
                () -> assertEquals(Boolean.TRUE, properties(loan).get("repaid_at").get("nullable"), "repaid_at nullable"),
                () -> assertTrue(
                        required(tripFinance).containsAll(List.of(
                                "trip_id", "trip_title", "destination", "trip_status", "start_date", "end_date",
                                "companion_count", "is_eligible", "ineligible_reason", "wallet", "insurance",
                                "loans")),
                        "trip finance required fields"),
                () -> assertEquals(
                        List.of("not_participant", "trip_closed"),
                        enums(properties(tripFinance).get("ineligible_reason")),
                        "ineligible reason enum"),
                () -> assertTrue(
                        required(myFinance).containsAll(List.of("wallet", "ledger", "policies", "loans")),
                        "my finance required fields"),
                () -> assertEquals(
                        10000,
                        properties(loanRequest).get("principal_cents").get("minimum"),
                        "principal minimum"),
                () -> assertEquals(
                        200000,
                        properties(loanRequest).get("principal_cents").get("maximum"),
                        "principal maximum"),
                () -> assertEquals(
                        100,
                        properties(loanRequest).get("principal_cents").get("multipleOf"),
                        "principal whole yuan"),
                () -> assertEquals(
                        List.of(7, 14, 30),
                        properties(loanRequest).get("term_days").get("enum"),
                        "request term enum"),
                () -> assertTrue(
                        enums(properties(errorSchema).get("code")).containsAll(List.of(
                                "INSUFFICIENT_BALANCE", "ACTIVE_LOAN_EXISTS", "LOAN_NOT_ACTIVE")),
                        "travel finance error codes"),
                () -> assertFalse(
                        enums(properties(errorSchema).get("code")).contains("POLICY_EXISTS"),
                        "in-app purchase error code retired"),
                () -> assertTrue(
                        responses(purchase).keySet().containsAll(List.of("200", "401", "403", "404", "409")),
                        "third-party purchase response statuses"),
                () -> assertTrue(
                        responses(confirm).keySet().containsAll(List.of("200", "401", "403", "404", "409")),
                        "confirmation response statuses"),
                () -> assertTrue(
                        responses(postLoan).keySet().containsAll(List.of("201", "400", "403", "404", "409")),
                        "loan response statuses"),
                () -> assertTrue(
                        responses(repay).keySet().containsAll(List.of("200", "401", "403", "409")),
                        "repay response statuses")
        );
    }

    private Map<String, Object> loadYaml(Path specPath) throws IOException {
        return new Yaml().load(Files.readString(specPath));
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> paths(Map<String, Object> document) {
        return (Map<String, Object>) document.get("paths");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> operation(Map<String, Object> document, String path, String method) {
        Map<String, Object> pathItem = (Map<String, Object>) paths(document).get(path);
        return (Map<String, Object>) pathItem.get(method);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> responses(Map<String, Object> operation) {
        return (Map<String, Object>) operation.get("responses");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> components(Map<String, Object> document) {
        return (Map<String, Object>) document.get("components");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> schema(Map<String, Object> document, String name) {
        Map<String, Object> schemas = (Map<String, Object>) components(document).get("schemas");
        return (Map<String, Object>) schemas.get(name);
    }

    @SuppressWarnings("unchecked")
    private List<String> required(Map<String, Object> schema) {
        return (List<String>) schema.get("required");
    }

    @SuppressWarnings("unchecked")
        private Map<String, Map<String, Object>> properties(Map<String, Object> schema) {
            return (Map<String, Map<String, Object>>) schema.get("properties");
    }

    @SuppressWarnings("unchecked")
    private List<String> enums(Map<String, Object> schema) {
        return (List<String>) schema.get("enum");
    }

    @SuppressWarnings("unchecked")
    private List<String> parameterNames(Map<String, Object> document, Map<String, Object> operation) {
        List<Map<String, Object>> declared = (List<Map<String, Object>>) operation.get("parameters");
        Map<String, Object> shared = (Map<String, Object>) components(document).get("parameters");
        List<String> names = new ArrayList<>();
        for (Map<String, Object> parameter : declared) {
            String reference = (String) parameter.get("$ref");
            if (reference == null) {
                names.add((String) parameter.get("name"));
                continue;
            }
            String key = reference.substring(reference.lastIndexOf('/') + 1);
            names.add((String) ((Map<String, Object>) shared.get(key)).get("name"));
        }
        return names;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Map<String, Object>> allOfProperties(Map<String, Object> document, String schemaName) {
        Map<String, Object> composed = schema(document, schemaName);
        Map<String, Map<String, Object>> merged = new LinkedHashMap<>();
        for (Object part : (List<Object>) composed.get("allOf")) {
            Map<String, Object> item = (Map<String, Object>) part;
            Object reference = item.get("$ref");
            Map<String, Object> target = reference == null
                    ? item
                    : schema(document, ((String) reference).substring(((String) reference).lastIndexOf('/') + 1));
            Object declared = target.get("properties");
            if (declared != null) {
                merged.putAll((Map<String, Map<String, Object>>) declared);
            }
        }
        return merged;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> asMap(Object value) {
        return (Map<String, Object>) value;
    }

    @Test
    void in_openApiFile_out_notificationContractDeclared() throws IOException {
        // Given
        Map<String, Object> document = loadYaml(SPEC_PATH);
        Map<String, Object> info = asMap(document.get("info"));
        Map<String, Object> notification = schema(document, "Notification");
        Map<String, Object> target = schema(document, "NotificationTarget");
        Map<String, Object> counts = schema(document, "NotificationCounts");
        Map<String, Object> list = schema(document, "NotificationList");
        Map<String, Object> readRequest = schema(document, "NotificationReadRequest");
        Map<String, Object> event = schema(document, "NotificationEvent");
        Map<String, Object> myReport = schema(document, "MyReport");

        // When
        Map<String, Object> collection = operation(document, "/notifications", "get");
        Map<String, Object> stream = operation(document, "/notifications/stream", "get");
        Map<String, Object> readOne = operation(document, "/notifications/{notificationId}/read", "post");
        Map<String, Object> readScoped = operation(document, "/notifications/read", "post");
        Map<String, Object> items = asMap(properties(list).get("items"));
        Map<String, Object> byType = asMap(properties(counts).get("by_type"));

        // Then
        assertAll(
                () -> assertEquals("0.29.0", info.get("version"), "info.version"),
                () -> assertTrue(
                        paths(document).containsKey("/notifications")
                                && paths(document).containsKey("/notifications/stream")
                                && paths(document).containsKey("/notifications/{notificationId}/read")
                                && paths(document).containsKey("/notifications/read")
                                && paths(document).containsKey("/reports/mine"),
                        "notification and my-reports paths declared"),
                () -> assertEquals(
                        List.of("TRIP", "APPLICATION", "CHAT", "CREDIT",
                                "REPORT", "ACCOUNT", "SERVICE", "SYSTEM"),
                        enums(schema(document, "NotificationType")),
                        "notification types"),
                () -> assertTrue(
                        enums(schema(document, "NotificationEventName")).containsAll(List.of(
                                "trip_cancelled", "application_closed", "message",
                                "credit_recovered", "report_resolved", "account_banned",
                                "service_reply", "identity_verified")),
                        "event names declared"),
                () -> assertEquals(
                        List.of("NORMAL", "HIGH"),
                        enums(schema(document, "NotificationPriority")),
                        "priorities"),
                () -> assertEquals(
                        List.of("UNREAD", "READ"),
                        enums(schema(document, "NotificationStatus")),
                        "statuses"),
                () -> assertEquals(
                        List.of("trip", "applications", "chat", "credit",
                                "report", "account", "support", "identity"),
                        enums(schema(document, "NotificationTargetKind")),
                        "target kinds"),
                () -> assertTrue(
                        required(notification).containsAll(List.of(
                                "id", "type", "event", "title", "content", "priority",
                                "status", "created_at", "target", "related_available")),
                        "notification required fields"),
                () -> assertTrue(
                        required(target).contains("kind"), "target always names a kind"),
                () -> assertTrue(
                        required(counts).containsAll(List.of("total", "by_type")),
                        "notification counts required fields"),
                () -> assertTrue(
                        asMap(byType).get("required") instanceof List<?> requiredTypes
                                && requiredTypes.containsAll(List.of(
                                        "TRIP", "APPLICATION", "CHAT", "CREDIT",
                                        "REPORT", "ACCOUNT", "SERVICE", "SYSTEM")),
                        "all eight counters are required"),
                () -> assertEquals(0, properties(counts).get("total").get("minimum"), "total minimum"),
                () -> assertTrue(
                        required(list).containsAll(List.of("items", "counts")),
                        "notification list required fields"),
                () -> assertEquals(50, items.get("maxItems"), "notification list maxItems"),
                () -> assertEquals(
                        List.of("all", "conversation"),
                        enums(properties(readRequest).get("scope")),
                        "read scopes"),
                () -> assertTrue(required(event).contains("notification"), "notification event payload"),
                () -> assertTrue(
                        required(myReport).containsAll(List.of(
                                "id", "code", "target_type", "reason", "status", "created_at")),
                        "my report required fields"),
                () -> assertTrue(
                        !properties(myReport).containsKey("resolution_note"),
                        "my report never exposes the admin note"),
                () -> assertTrue(responses(collection).containsKey("200"), "collection returns 200"),
                () -> assertTrue(responses(collection).containsKey("401"), "collection returns 401"),
                () -> assertTrue(responses(stream).containsKey("200"), "stream returns 200"),
                () -> assertTrue(responses(readOne).containsKey("404"), "single read returns 404"),
                () -> assertTrue(responses(readScoped).containsKey("400"), "scoped read returns 400"),
                () -> assertTrue(
                        parameterNames(document, stream).contains("user_id"),
                        "stream takes user_id"),
                () -> assertTrue(
                        parameterNames(document, collection).contains("X-User-Id"),
                        "collection takes X-User-Id"),
                () -> assertTrue(
                        enums(properties(schema(document, "Error")).get("code"))
                                .contains("NOTIFICATION_NOT_FOUND"),
                        "notification error code"),
                () -> assertEquals(
                        "#/components/schemas/NotificationStatus",
                        asMap(properties(notification).get("status")).get("$ref"),
                        "status references the enum schema")
        );
    }
}

