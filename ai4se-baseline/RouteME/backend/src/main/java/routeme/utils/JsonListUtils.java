package routeme.utils;

import java.util.List;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

/**
 * 列表字段以 JSON 文本存储（SQLite 与 H2 共用一套迁移，不用 JSON 扩展函数）。
 */
public final class JsonListUtils {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() {
    };

    private JsonListUtils() {
    }

    public static List<String> parse(String json) {
        try {
            return List.copyOf(MAPPER.readValue(json, STRING_LIST));
        } catch (RuntimeException exception) {
            throw new IllegalStateException("invalid json list in database: " + json, exception);
        }
    }

    public static String write(List<String> values) {
        try {
            return MAPPER.writeValueAsString(values);
        } catch (RuntimeException exception) {
            throw new IllegalStateException("cannot serialize list to json", exception);
        }
    }
}