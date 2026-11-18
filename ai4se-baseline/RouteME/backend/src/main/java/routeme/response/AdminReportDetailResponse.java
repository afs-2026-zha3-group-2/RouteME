package routeme.response;

import com.fasterxml.jackson.annotation.JsonInclude;

/** 举报详情（schema {@code AdminReportDetail}）。 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AdminReportDetailResponse(
        long id,
        String code,
        String targetType,
        long targetId,
        String targetLabel,
        AdminUserRef reporter,
        ReportedUserResponse reportedUser,
        String reason,
        String createdAt,
        String status,
        String note,
        AdminReportTargetResponse target,
        AdminReportContextResponse context,
        AdminUserRef processedBy,
        String processingAt,
        String resolvedAt,
        String resolutionNote,
        String resolutionAction,
        String violationType,
        Integer appliedDeduction) {
}