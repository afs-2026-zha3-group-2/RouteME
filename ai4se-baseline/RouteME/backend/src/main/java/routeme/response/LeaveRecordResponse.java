package routeme.response;

import java.time.Instant;
import java.util.List;

import routeme.entity.CreditExitAttachmentEntity;
import routeme.entity.CreditExitEventEntity;

/**
 * 本人查看自己的退出记录：原因、说明、信用影响与证明材料；只读。
 * applicationId 关联这次退出所属的同行关系，旧数据可能为空。
 */
public record LeaveRecordResponse(
        String reason,
        String note,
        Instant exitAt,
        String reviewStatus,
        int theoreticalDelta,
        int appliedDelta,
        int monthlyOrdinal,
        List<LeaveRecordAttachmentResponse> attachments,
        Long applicationId) {

    public static LeaveRecordResponse from(
            CreditExitEventEntity event, List<CreditExitAttachmentEntity> attachments) {
        return new LeaveRecordResponse(
                event.getExitReason(),
                event.getExitNote(),
                Instant.parse(event.getExitAt()),
                event.getReviewStatus(),
                event.getTheoreticalDelta(),
                event.getAppliedDelta(),
                event.getMonthlyOrdinal(),
                attachments.stream()
                        .map(LeaveRecordAttachmentResponse::from)
                        .toList(),
                event.getApplicationId());
    }

    public record LeaveRecordAttachmentResponse(
            long id,
            String originalName,
            String contentType,
            long sizeBytes,
            String url) {

        public static LeaveRecordAttachmentResponse from(CreditExitAttachmentEntity entity) {
            return new LeaveRecordAttachmentResponse(
                    entity.getId(),
                    entity.getOriginalName(),
                    entity.getContentType(),
                    entity.getSizeBytes(),
                    "/api/leave-evidence/" + entity.getId());
        }
    }
}
