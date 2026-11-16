package routeme.utils;

import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

import routeme.constant.AuthConstant;

/**
 * 密码散列与会话 token 生成：JDK 自带 PBKDF2，不引入第三方加密依赖。
 *
 * <p>存储格式为 {@code pbkdf2$迭代次数$盐$散列}，盐与散列均为无填充 Base64URL。
 * 校验使用常量时间比较，避免按字节提前返回。</p>
 */
public final class PasswordUtils {

    private static final String ALGORITHM = "PBKDF2WithHmacSHA256";
    private static final String PREFIX = "pbkdf2";
    private static final int ITERATIONS = 120_000;
    private static final int SALT_BYTES = 16;
    private static final int KEY_LENGTH_BITS = 256;
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

    private PasswordUtils() {
    }

    /**
     * 生成加盐散列。
     *
     * @param raw 明文密码，调用方已完成长度校验
     * @return {@code pbkdf2$iter$salt$hash}
     */
    public static String hash(String raw) {
        byte[] salt = new byte[SALT_BYTES];
        RANDOM.nextBytes(salt);
        byte[] derived = derive(raw, salt, ITERATIONS);
        return PREFIX + "$" + ITERATIONS + "$" + ENCODER.encodeToString(salt) + "$" + ENCODER.encodeToString(derived);
    }

    /**
     * 校验明文密码是否匹配已存储的散列。
     *
     * @param raw     用户提交的明文密码
     * @param encoded 数据库中的散列；null 表示该账户没有密码凭据
     * @return 仅当格式正确且散列一致时为 true
     */
    public static boolean matches(String raw, String encoded) {
        if (raw == null || encoded == null) {
            return false;
        }
        String[] parts = encoded.split("\\$");
        if (parts.length != 4 || !PREFIX.equals(parts[0])) {
            return false;
        }
        try {
            int iterations = Integer.parseInt(parts[1]);
            byte[] salt = DECODER.decode(parts[2]);
            byte[] expected = DECODER.decode(parts[3]);
            return MessageDigest.isEqual(expected, derive(raw, salt, iterations));
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    /**
     * 生成不透明会话 token（32 字节随机数的 Base64URL）。
     *
     * @return 可直接放入 Bearer 头的 token
     */
    public static String newToken() {
        byte[] bytes = new byte[AuthConstant.TOKEN_BYTES];
        RANDOM.nextBytes(bytes);
        return ENCODER.encodeToString(bytes);
    }

    private static byte[] derive(String raw, byte[] salt, int iterations) {
        try {
            PBEKeySpec spec = new PBEKeySpec(raw.toCharArray(), salt, iterations, KEY_LENGTH_BITS);
            try {
                return SecretKeyFactory.getInstance(ALGORITHM).generateSecret(spec).getEncoded();
            } finally {
                spec.clearPassword();
            }
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("password hashing is unavailable", exception);
        }
    }
}