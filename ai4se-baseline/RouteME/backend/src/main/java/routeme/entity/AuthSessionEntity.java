package routeme.entity;

import java.time.Instant;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import routeme.pojo.AuthSession;

/**
 * auth_sessions 行对象：token 即主键，时间沿用 ISO-8601 文本。
 */
@TableName("auth_sessions")
public class AuthSessionEntity {

    @TableId(type = IdType.INPUT)
    private String token;

    private Long userId;

    private String createdAt;

    private String expiresAt;

    public static AuthSessionEntity from(AuthSession session) {
        AuthSessionEntity entity = new AuthSessionEntity();
        entity.setToken(session.token());
        entity.setUserId(session.userId());
        entity.setCreatedAt(session.createdAt().toString());
        entity.setExpiresAt(session.expiresAt().toString());
        return entity;
    }

    public AuthSession toAuthSession() {
        return new AuthSession(token, userId, Instant.parse(createdAt), Instant.parse(expiresAt));
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(String expiresAt) {
        this.expiresAt = expiresAt;
    }
}