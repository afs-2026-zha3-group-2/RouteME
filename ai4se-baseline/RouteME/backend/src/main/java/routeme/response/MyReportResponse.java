package routeme.response;

import java.time.Instant;

import routeme.pojo.Report;

/**
 * 举报人视角的举报条目。
 *
 * <p>只暴露举报人已经知道的业务事实：编号、对象类型、原因、状态与时间；
 * 管理员备注（{@code resolution_note}）、处理人 id 与他人的处罚细节一律不返回。</p>
 */
public record MyReportResponse(
        long id,
        String code,
        String targetType,
        String reason,
        String status,
        Instant createdAt,
        Instant processingAt,
        Instant resolvedAt) {

    public static MyReportResponse from(Report report) {
        return new MyReportResponse(
                report.id(),
                ReportCode.of(report.id()),
                report.targetType(),
                report.reason(),
                report.status(),
                report.createdAt(),
                report.processingAt(),
                report.resolvedAt());
    }

    /** 举报编号：与前端 / 管理端一致的 {@code R-<id>} 形式。 */
    public static final class ReportCode {

        private ReportCode() {
        }

        public static String of(long reportId) {
            return "R-" + reportId;
        }
    }
}