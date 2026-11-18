package routeme.response;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

/** 客服会话详情：摘要 + 完整消息 + 该用户的相关举报。 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ServiceSessionDetailResponse(
        long id,
        ServiceUserResponse user,
        String status,
        String createdAt,
        String joinedAt,
        String closedAt,
        String resolvedAt,
        String lastMessageAt,
        long messageCount,
        List<ServiceMessageResponse> messages,
        List<AdminUserReportRef> reports) {
}