package routeme.request;

/**
 * 登录请求。字段与契约 AuthLoginRequest 一一对应。
 */
public record AuthLoginRequest(String username, String password) {
}