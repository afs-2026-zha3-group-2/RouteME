package routeme.response;

import com.fasterxml.jackson.annotation.JsonInclude;

/** 举报队列行（schema {@code AdminReportSummary}）。 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AdminReportSummaryResponse(
        long id,
        String code,
        String targetType,
        long targetId,
        String targetLabel,
        AdminUserRef reporter,
        ReportedUserResponse reportedUser,
        String reason,
        String createdAt,
        String status) {
}