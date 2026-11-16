package routeme.response;

import java.time.Instant;

import routeme.pojo.AuthSession;
import routeme.pojo.DemoUser;

/**
 * 注册/登录成功的会话响应：token、过期时间与用户公开资料。
 */
public record AuthSessionResponse(String token, Instant expiresAt, DemoUserResponse user) {

    public static AuthSessionResponse from(AuthSession session, DemoUser user) {
        return new AuthSessionResponse(session.token(), session.expiresAt(), DemoUserResponse.from(user));
    }
}