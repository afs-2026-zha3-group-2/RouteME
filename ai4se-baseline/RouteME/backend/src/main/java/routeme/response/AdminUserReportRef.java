package routeme.response;

/**
 * 管理端用户详情里的举报引用。{@code direction} 表示该用户是举报人（{@code REPORTER}）
 * 还是被举报人（{@code REPORTED}）。
 */
public record AdminUserReportRef(
        long id,
        String code,
        String direction,
        String status,
        String reason,
        String createdAt) {
}