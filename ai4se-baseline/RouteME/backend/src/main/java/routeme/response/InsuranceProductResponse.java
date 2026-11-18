package routeme.response;

/**
 * 第三方提供的保障类别：只描述范围，不含价格、保额或免责条款正文。
 */
public record InsuranceProductResponse(String code, String title, String summary) {
}