package routeme.response;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * 举报对象上下文。{@code exists=false} 时 {@code content_excerpt} 为 null，
 * 前端显示「内容已不可用」且不提供跳转。
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AdminReportTargetResponse(
        String type,
        long id,
        String label,
        boolean exists,
        String contentExcerpt) {
}