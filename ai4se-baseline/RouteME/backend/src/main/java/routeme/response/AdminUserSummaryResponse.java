package routeme.response;

import com.fasterxml.jackson.annotation.JsonInclude;

/** 管理端用户列表行（schema {@code AdminUserSummary}）。 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AdminUserSummaryResponse(
        long id,
        String nickname,
        String avatarInitial,
        String avatarUrl,
        String email,
        String role,
        String status,
        String createdAt) {
}