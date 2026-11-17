package routeme.response;

import com.fasterxml.jackson.annotation.JsonInclude;

/** 举报取证用聊天消息（schema {@code AdminReportMessage}）。 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AdminReportMessageResponse(
        long id,
        AdminUserRef sender,
        AdminUserRef receiver,
        String content,
        String sentAt) {
}