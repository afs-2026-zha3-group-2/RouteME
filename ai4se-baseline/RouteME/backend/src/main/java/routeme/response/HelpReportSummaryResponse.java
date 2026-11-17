package routeme.response;

/** {@code GET /help/reports} 的行：不含备注、处理人与被举报人处罚信息。 */
public record HelpReportSummaryResponse(
        long id,
        String code,
        String targetType,
        long targetId,
        String targetLabel,
        String reason,
        String createdAt,
        String status) {
}