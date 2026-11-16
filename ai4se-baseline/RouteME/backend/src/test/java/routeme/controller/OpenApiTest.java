package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

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
                () -> assertEquals("0.6.0", info.get("version"), "info.version"),
                () -> assertTrue(paths(document).containsKey("/users"), "/users declared"),
                () -> assertTrue(paths(document).containsKey("/trips/{tripId}"), "detail path declared"),
                () -> assertTrue(
                        parameterNames(document, getTrips)
                                .containsAll(List.of(
                                        "X-User-Id", "q", "destination", "date_from", "date_to", "tags",
                                        "page", "size")),
                        "list query parameters"),
                () -> assertTrue(responses(postTrips).containsKey("201"), "create returns 201"),
                () -> assertTrue(responses(postTrips).containsKey("400"), "create returns 400"),
                () -> assertTrue(responses(completeTrip).containsKey("403"), "complete returns 403"),
                () -> assertTrue(responses(completeTrip).containsKey("409"), "complete returns 409"),
                () -> assertTrue(
                        required(createRequest)
                                .containsAll(List.of("title", "destination", "start_date", "end_date", "stops", "capacity")),
                        "create required fields"),
                () -> assertTrue(
                        enums(properties(tripPlan).get("status"))
                                .containsAll(List.of("recruiting", "full", "completed")),
                        "status enum"),
                () -> assertTrue(
                                        enums(properties(errorSchema).get("code"))
                                .containsAll(List.of(
                                        "INVALID_INPUT",
                                        "DEMO_USER_REQUIRED",
                                        "FORBIDDEN",
                                        "TRIP_NOT_FOUND",
                                        "TRIP_NOT_OPEN")),
                        "error codes"),
                () -> assertEquals(Boolean.TRUE, properties(tripPlan).get("status").get("readOnly"), "status readOnly")
        );
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
                        required(register)
                                .containsAll(List.of("username", "password", "nickname", "school", "interests")),
                        "register required fields"),
                () -> assertTrue(
                        required(session).containsAll(List.of("token", "expires_at", "user")),
                        "session required fields")
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
        Map<String, Object> reportRequest = schema(document, "ReportRequest");
        Map<String, Object> errorSchema = schema(document, "Error");

        // Then
        assertAll(
                () -> assertTrue(paths(document).containsKey("/me/trips"), "/me/trips declared"),
                () -> assertTrue(paths(document).containsKey("/matches/{tripId}"), "match detail declared"),
                () -> assertTrue(responses(postApplications).containsKey("201"), "apply returns 201"),
                () -> assertTrue(responses(postMessages).containsKey("409"), "chat read-only conflict"),
                () -> assertTrue(
                        parameterNames(document, getMatches).containsAll(List.of("X-User-Id", "q", "sort")),
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
                                .containsAll(List.of("pending", "accepted", "rejected", "cancelled")),
                        "application status enum"),
                () -> assertTrue(
                        required(myTrips)
                                .containsAll(List.of(
                                        "published", "applied", "matched", "completed", "pending_application_count")),
                        "my trips groups"),
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
        Map<String, Object> writeRequest = schema(document, "ExperienceWriteRequest");
        Map<String, Object> experience = schema(document, "Experience");
        Map<String, Object> errorSchema = schema(document, "Error");

        // Then
        assertAll(
                () -> assertTrue(paths(document).containsKey("/me/experiences"), "/me/experiences declared"),
                () -> assertTrue(
                        responses(postExperience).containsKey("201")
                                && responses(postExperience).containsKey("200"),
                        "experience create/update statuses"),
                () -> assertTrue(
                        parameterNames(document, getExperiences).containsAll(List.of("X-User-Id", "q", "destination", "tags")),
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
                                .containsAll(List.of("id", "trip", "author", "content", "intensity", "advice")),
                        "experience required fields"),
                () -> assertTrue(
                        enums(properties(errorSchema).get("code")).contains("EXPERIENCE_NOT_ALLOWED"),
                        "experience error code")
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
    private Map<String, Object> asMap(Object value) {
        return (Map<String, Object>) value;
    }
}