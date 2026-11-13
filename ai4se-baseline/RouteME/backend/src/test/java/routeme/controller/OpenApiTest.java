package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
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

    @SuppressWarnings("unchecked")
    private Map<String, Object> loadYaml(Path specPath) throws IOException {
        return new Yaml().load(Files.readString(specPath));
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> operation(Map<String, Object> document, String path, String method) {
        Map<String, Object> paths = (Map<String, Object>) document.get("paths");
        Map<String, Object> pathItem = (Map<String, Object>) paths.get(path);
        return (Map<String, Object>) pathItem.get(method);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> responses(Map<String, Object> operation) {
        return (Map<String, Object>) operation.get("responses");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> schema(Map<String, Object> document, String name) {
        Map<String, Object> components = (Map<String, Object>) document.get("components");
        Map<String, Object> schemas = (Map<String, Object>) components.get("schemas");
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
}
