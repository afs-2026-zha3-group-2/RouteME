package routeme.response;

import routeme.pojo.UserCredit;

/**
 * 批量信用状态响应项：只暴露分数与等级码，不含任何明细。
 */
public record UserCreditResponse(long userId, int creditScore, String creditLevel) {

    public static UserCreditResponse from(UserCredit credit) {
        return new UserCreditResponse(credit.userId(), credit.score(), credit.levelCode());
    }
}
