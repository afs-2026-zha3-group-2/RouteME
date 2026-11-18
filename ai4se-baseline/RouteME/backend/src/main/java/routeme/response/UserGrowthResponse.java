package routeme.response;

import com.fasterxml.jackson.annotation.JsonInclude;

import routeme.pojo.UserGrowth;

/**
 * 个人主页成长响应：本人额外返回经验与满级标记，他人只返回等级。
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record UserGrowthResponse(int level, Integer exp, Integer expToNext, Boolean maxLevel) {

    public static UserGrowthResponse from(UserGrowth growth, boolean includeExp) {
        return new UserGrowthResponse(
                growth.level(),
                includeExp ? growth.expTotal() : null,
                includeExp ? growth.expToNext() : null,
                includeExp ? growth.maxLevel() : null);
    }
}
