package routeme.request;

/**
 * 账号状态迁移请求。{@code action} 为 {@code SUSPEND} / {@code BAN} / {@code RESTORE}；
 * {@code reason} 对前两者必填，{@code ban_expires_at} 仅 {@code BAN} 必填。
 */
public record AdminUserStatusRequest(
        String action,
        String reason,
        String banReasonCode,
        String banReasonNote,
        String banExpiresAt) {
}