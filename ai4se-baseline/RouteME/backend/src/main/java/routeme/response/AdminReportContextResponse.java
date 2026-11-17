package routeme.response;

import java.util.List;

/**
 * 举报来源上下文（schema {@code AdminReportContext}）。
 *
 * <p>{@code origin=chat} 表示举报来自行程聊天，{@code messages} 是举报人与被举报人在
 * {@code trip} 下的完整会话；{@code origin=trip} 表示举报对象就是该行程，此时
 * {@code messages} 为空数组。</p>
 */
public record AdminReportContextResponse(
        String origin,
        AdminReportTripContextResponse trip,
        List<AdminReportMessageResponse> messages) {
}