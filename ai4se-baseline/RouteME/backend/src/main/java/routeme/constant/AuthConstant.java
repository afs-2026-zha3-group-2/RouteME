package routeme.constant;

/**
 * 账号认证的边界值：注册校验、密码散列与会话签发共用同一组定义。
 */
public final class AuthConstant {

    public static final String USERNAME_PATTERN = "^[A-Za-z0-9_]{3,20}$";
    public static final int MIN_PASSWORD_LENGTH = 8;
    public static final int MAX_PASSWORD_LENGTH = 64;
    public static final int MAX_NICKNAME_LENGTH = 20;
    public static final int SESSION_TTL_DAYS = 7;
    public static final int TOKEN_BYTES = 32;

    private AuthConstant() {
    }
}