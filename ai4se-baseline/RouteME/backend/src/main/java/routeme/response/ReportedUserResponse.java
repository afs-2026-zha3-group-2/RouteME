package routeme.response;

/** 举报对象用户的公开摘要；{@code status} 为有效状态（到期封禁按 {@code ACTIVE} 展示）。 */
public record ReportedUserResponse(
        long id, String nickname, String status, Integer creditScore, String creditLevel) {
}