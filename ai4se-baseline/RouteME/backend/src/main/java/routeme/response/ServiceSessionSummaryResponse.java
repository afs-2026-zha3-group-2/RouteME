package routeme.response;

import com.fasterxml.jackson.annotation.JsonInclude;

/** 客服会话行（schema {@code ServiceSessionSummary}）。 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ServiceSessionSummaryResponse(
        long id,
        ServiceUserResponse user,
        String status,
        String createdAt,
        String joinedAt,
        String closedAt,
        String resolvedAt,
        String lastMessageAt,
        long messageCount) {
}