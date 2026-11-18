package routeme.response;

import routeme.pojo.CreditExitResult;

/**
 * 退出结果响应：退出后的实际信用分、等级与本次结算值。
 */
public record LeaveResultResponse(
        int creditScore,
        String creditLevel,
        boolean creditRestricted,
        int theoreticalDelta,
        int appliedDelta,
        int monthlyOrdinal,
        String reviewStatus,
        String messageCode) {

    public static LeaveResultResponse from(CreditExitResult result) {
        return new LeaveResultResponse(
                result.creditScore(),
                result.creditLevel(),
                result.creditRestricted(),
                result.theoreticalDelta(),
                result.appliedDelta(),
                result.monthlyOrdinal(),
                result.reviewStatus().wireValue(),
                result.messageCode().wireValue());
    }
}
