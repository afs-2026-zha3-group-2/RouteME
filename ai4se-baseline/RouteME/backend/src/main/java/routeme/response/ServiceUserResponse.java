package routeme.response;

import com.fasterxml.jackson.annotation.JsonInclude;

/** 客服会话里的用户摘要。 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ServiceUserResponse(
        long id,
        String nickname,
        String avatarInitial,
        String email,
        String status,
        String createdAt) {
}