package routeme.response;

import java.time.LocalDate;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * 行程维度旅行保障页：行程上下文、当前用户资格、自己的钱包 / 保险摘要 / 借款。
 */
public record TripFinanceResponse(
        long tripId,
        String tripTitle,
        String destination,
        String tripStatus,
        LocalDate startDate,
        LocalDate endDate,
        int companionCount,
        @JsonProperty("is_eligible") boolean isEligible,
        String ineligibleReason,
        WalletResponse wallet,
        InsuranceSummaryResponse insurance,
        List<TravelLoanResponse> loans) {
}