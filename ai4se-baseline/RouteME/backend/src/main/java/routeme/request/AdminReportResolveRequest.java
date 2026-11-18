package routeme.request;

/**
 * 举报处理请求。{@code outcome} 为 {@code RESOLVED} / {@code REJECTED}，{@code note} 必填；
 * 成立时 {@code violationType} 必填，{@code OTHER} 需再给 {@code otherDeduction}（5 / 10 / 20 / 30）。
 */
public record AdminReportResolveRequest(
        String outcome,
        String note,
        String violationType,
        Integer otherDeduction) {
}