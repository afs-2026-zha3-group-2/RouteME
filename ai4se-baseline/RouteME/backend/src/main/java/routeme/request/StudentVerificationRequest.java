package routeme.request;

/**
 * 学信网学籍认证请求（演示核验）：姓名、院校与 12 位在线验证码。
 * 验证码只做格式与存在性校验，不落库。
 */
public record StudentVerificationRequest(
        String name,
        String school,
        String code) {
}
