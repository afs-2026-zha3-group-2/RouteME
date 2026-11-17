package routeme.response;

import java.util.List;

/** {@code GET /help/reports}：本人最近 50 条举报 + 全量总数。 */
public record HelpReportsResponse(List<HelpReportSummaryResponse> items, long total) {
}