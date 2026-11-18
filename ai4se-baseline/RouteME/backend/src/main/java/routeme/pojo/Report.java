package routeme.pojo;

import java.time.Instant;

/**
 * Report row. {@code status} starts at PENDING; processing metadata is filled by administrators.
 * {@code contextTripId} pins the trip chat a user report was submitted from.
 */
public record Report(
        long id,
        String targetType,
        long targetId,
        long reporterId,
        String reason,
        String note,
        Long contextTripId,
        Instant createdAt,
        String status,
        Long processedBy,
        Instant processingAt,
        Instant resolvedAt,
        String resolutionNote,
        String resolutionAction,
        String violationType,
        Integer appliedDeduction) {
}