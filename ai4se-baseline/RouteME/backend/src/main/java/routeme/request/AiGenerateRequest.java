package routeme.request;

import java.util.List;

import routeme.pojo.AiPlace;

/**
 * AI 生成请求（契约 AiGenerateRequest）：origin/destination/date 必填，
 * 其余选填；枚举与默认值由服务层规范化校验。
 *
 * @param origin       出发地（名称 + 高德经纬度）
 * @param destination  目的地（名称 + 高德经纬度）
 * @param date         旅行日期 yyyy-MM-dd，须落在预报窗口内
 * @param duration     half_day | one_day | two_day，默认 one_day
 * @param budgetCents  预算（整数分），可空
 * @param travelMode   transit | walking | driving，默认 transit
 * @param interests    兴趣偏好，可空
 * @param pace         relaxed | moderate | compact，默认 moderate
 * @param reduceBudget 「AI 帮我降低预算」时为 true，默认 false
 */
public record AiGenerateRequest(
        AiPlace origin,
        AiPlace destination,
        String date,
        String duration,
        Long budgetCents,
        String travelMode,
        List<String> interests,
        String pace,
        Boolean reduceBudget) {
}