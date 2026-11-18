package routeme.response;

import java.time.Instant;
import java.time.LocalDate;

import routeme.pojo.InsurancePolicy;

/**
 * 第三方保险状态响应：状态 active / expired 由保障结束日派生，
 * 不包含保费、保额、保单号或任何投保敏感信息。
 */
public record InsurancePolicyResponse(
        long id,
        long tripId,
        String provider,
        LocalDate coverageStart,
        LocalDate coverageEnd,
        String status,
        Instant confirmedAt) {

    public static InsurancePolicyResponse from(InsurancePolicy policy, Instant now) {
        return new InsurancePolicyResponse(
                policy.id(),
                policy.tripId(),
                policy.provider(),
                policy.coverageStart(),
                policy.coverageEnd(),
                policy.wireStatus(now),
                policy.confirmedAt());
    }
}