package routeme.response;

import com.fasterxml.jackson.annotation.JsonInclude;

import routeme.constant.GrowthConstant;
import routeme.pojo.UserGrowth;

/**
 * 个人主页成长响应：本人额外返回经验、满级标记与今日正向经验额度，他人只返回等级。
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record UserGrowthResponse(
        int level,
        Integer exp,
        Integer expToNext,
        Boolean maxLevel,
        Integer dailyExp,
        Integer dailyLimit) {

    public static UserGrowthResponse from(UserGrowth growth, boolean includeExp) {
        return from(growth, includeExp, null);
    }

    public static UserGrowthResponse from(UserGrowth growth, boolean includeExp, Integer dailyExp) {
        return new UserGrowthResponse(
                growth.level(),
                includeExp ? growth.expTotal() : null,
                includeExp ? growth.expToNext() : null,
                includeExp ? growth.maxLevel() : null,
                includeExp ? dailyExp : null,
                includeExp ? GrowthConstant.DAILY_POSITIVE_LIMIT : null);
    }
}
