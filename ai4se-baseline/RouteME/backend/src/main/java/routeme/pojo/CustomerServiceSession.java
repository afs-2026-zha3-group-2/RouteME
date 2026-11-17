package routeme.pojo;

import java.time.Instant;

/** 客服会话聚合。 */
public record CustomerServiceSession(
        long id,
        long userId,
        String status,
        Instant createdAt,
        Instant joinedAt,
        Long joinedBy,
        Instant closedAt,
        Long closedBy) {
}