package routeme.response;

import java.util.Map;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * 错误响应：{@code fields} 只在资料校验失败时出现，其余错误保持只有 {@code code}。
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(String code, Map<String, String> fields) {

    public ErrorResponse(String code) {
        this(code, null);
    }
}