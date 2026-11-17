package routeme.request;

/**
 * 举报处理请求。{@code outcome} 为 {@code RESOLVED} / {@code REJECTED}，{@code note} 必填；
 * {@code action} 仅在 {@code outcome=RESOLVED} 时生效。
 */
public record AdminReportResolveRequest(
        String outcome,
        String note,
        String action,
        String banReasonCode,
        String banReasonNote,
        String banExpiresAt) {
}