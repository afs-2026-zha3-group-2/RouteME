package routeme.response;

import routeme.pojo.UserGrowth;

/**
 * 批量成长等级响应项：只暴露等级，不含经验值或流水。
 */
public record UserGrowthEntryResponse(long userId, int level) {

    public static UserGrowthEntryResponse from(UserGrowth growth) {
        return new UserGrowthEntryResponse(growth.userId(), growth.level());
    }
}
