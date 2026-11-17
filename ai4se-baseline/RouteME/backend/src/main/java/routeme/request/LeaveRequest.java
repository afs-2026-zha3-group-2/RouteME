package routeme.request;

/**
 * 退出同行请求：原因必选（personal / force_majeure / safety）。
 */
public record LeaveRequest(String reason) {
}
