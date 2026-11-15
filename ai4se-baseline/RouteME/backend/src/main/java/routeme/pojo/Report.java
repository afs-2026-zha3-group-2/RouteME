package routeme.pojo;

import java.time.Instant;

/**
 * 举报记录；MVP 只记录，不提供处置后台。
 */
public record Report(
        long id,
        String targetType,
        long targetId,
        long reporterId,
        String reason,
        String note,
        Instant createdAt) {
}