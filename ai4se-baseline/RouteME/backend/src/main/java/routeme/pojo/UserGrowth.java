package routeme.pojo;

import routeme.model.GrowthLevelRules;

/**
 * 成长状态只读视图：总经验恒为非负，等级与距下一级由总经验实时派生。
 */
public record UserGrowth(
        long userId,
        int expTotal,
        int level,
        Integer expToNext,
        boolean maxLevel) {

    public static UserGrowth of(long userId, int exp) {
        int normalized = Math.max(0, exp);
        return new UserGrowth(
                userId,
                normalized,
                GrowthLevelRules.levelOf(normalized),
                GrowthLevelRules.expToNext(normalized),
                GrowthLevelRules.maxLevel(normalized));
    }
}
