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
                () -> assertTrue(paths(document).containsKey("/users/credits"), "batch credit path declared"),
                () -> assertTrue(
                        required(creditEntry).containsAll(List.of("user_id", "credit_score", "credit_level")),
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
                () -> assertEquals("0.16.0", info.get("version"), "info.version"),
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
                () -> assertTrue(properties(tripPlan).containsKey("province_name"), "province_name declared")
        );
    }

    @Test
    void in_openApiFile_out_weatherContractDeclared() throws IOException {
        // Given
        Map<String, Object> document = loadYaml(SPEC_PATH);

        // When
        Map<String, Object> forecast = operation(document, "/weather/forecast", "get");
        Map<String, Object> forecastSchema = schema(document, "WeatherForecast");
        Map<String, Object> dailySchema = schema(document, "WeatherDaily");
        Map<String, Object> reminderSchema = schema(document, "WeatherReminder");
        Map<String, Object> errorSchema = schema(document, "Error");

        // Then
        assertAll(
                () -> assertTrue(paths(document).containsKey("/weather/forecast"), "weather path declared"),
                () -> assertTrue(
                        parameterNames(document, forecast).containsAll(List.of("destination_code", "date", "lng", "lat")),
                        "weather query parameters"),
                () -> assertTrue(responses(forecast).containsKey("200"), "weather returns 200"),
                () -> assertTrue(responses(forecast).containsKey("400"), "weather returns 400"),
                () -> assertTrue(responses(forecast).containsKey("502"), "weather returns 502"),
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
                                List.of("id", "nickname", "avatar_initial", "bio", "interests", "profile_complete")),
                        "demo user required fields"),
                () -> assertTrue(
                        properties(demoUser).keySet().containsAll(List.of("avatar_url", "city", "major", "job")),
                        "demo user summary fields"),
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
                                "mbti", "travel_style", "bio", "joined_at", "stats")),
                        "profile derived and optional fields"),
                () -> assertTrue(
                        required(profile).stream().noneMatch(List.of("joined_at", "stats")::contains),
                        "joined_at and stats are optional"),
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
        Map<String, Object> getMatches = operation(document, "/matches", "get");
        Map<String, Object> postApplications = operation(document, "/trips/{tripId}/applications", "post");
        Map<String, Object> postMessages = operation(document, "/trips/{tripId}/messages", "post");
        Map<String, Object> application = schema(document, "TripApplication");
        Map<String, Object> match = schema(document, "Match");
        Map<String, Object> myTrips = schema(document, "MyTrips");
        Map<String, Object> pendingApplicationCount = schema(document, "PendingApplicationCount");
        Map<String, Object> reportRequest = schema(document, "ReportRequest");
        Map<String, Object> errorSchema = schema(document, "Error");

        // Then
        assertAll(
                () -> assertTrue(paths(document).containsKey("/me/trips"), "/me/trips declared"),
                () -> assertTrue(paths(document).containsKey("/matches/{tripId}"), "match detail declared"),
                () -> assertTrue(responses(postApplications).containsKey("201"), "apply returns 201"),
                () -> assertTrue(responses(postMessages).containsKey("409"), "chat read-only conflict"),
                () -> assertTrue(
                        parameterNames(document, getMatches)
                                .containsAll(List.of(
                                        "X-User-Id", "destination_code", "date_from", "date_to", "tags",
                                        "sort", "page", "size")),
                        "match query parameters"),
                () -> assertTrue(
                        parameterNames(document, getMatches).containsAll(List.of("page", "size")),
                        "match paging parameters"),
                () -> assertTrue(
                        required(schema(document, "MatchPage"))
                                .containsAll(List.of("items", "page", "size", "total", "total_pages")),
                        "match page envelope"),
                () -> assertTrue(
                        required(match).containsAll(List.of("score", "percentage", "reasons", "basis")),
                        "match required fields"),
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
}