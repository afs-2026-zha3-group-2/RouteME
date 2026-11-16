package routeme.exception;

import java.util.Map;

import org.springframework.http.HttpStatus;

/**
 * 资料校验失败：暴露 400 {@code INVALID_INPUT} 与字段原因码，不包含字段值。
 */
public class InvalidProfileException extends BusinessException {

    private final Map<String, String> fields;

    public InvalidProfileException(Map<String, String> fields) {
        super("INVALID_INPUT", HttpStatus.BAD_REQUEST, "profile fields rejected: " + fields.keySet());
        this.fields = Map.copyOf(fields);
    }

    @Override
    public Map<String, String> fields() {
        return fields;
    }
}