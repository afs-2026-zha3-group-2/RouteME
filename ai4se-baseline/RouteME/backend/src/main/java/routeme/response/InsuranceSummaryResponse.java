package routeme.response;

import java.util.List;

/**
 * 行程保险摘要：状态、第三方提供方、保障类别、购买入口与该用户自己的保单。
 *
 * <p>未投保时 status 为 {@code not_purchased} 且 policy 为 null；
 * 已投保但保障期结束后 status 为 {@code expired}，保单仍返回。</p>
 */
public record InsuranceSummaryResponse(
        String status,
        InsuranceProviderResponse provider,
        List<InsuranceProductResponse> products,
        String purchaseUrl,
        InsurancePolicyResponse policy) {
}