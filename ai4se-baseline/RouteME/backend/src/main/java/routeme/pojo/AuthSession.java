package routeme.pojo;

import java.time.Instant;

/**
 * 登录会话：不透明 token 与其归属账号、过期时间。
 */
public record AuthSession(
        String token,
        long userId,
        Instant createdAt,
        Instant expiresAt) {
}