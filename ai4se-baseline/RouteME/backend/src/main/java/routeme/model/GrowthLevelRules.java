package routeme.model;

/**
 * 成长等级的纯规则：等级由总经验实时派生，不落库；LV5 之后继续累计但不再升级。
 *
 * <p>区间左闭右开、首尾相接：LV1 0–99、LV2 100–199、LV3 200–299、LV4 300–399、LV5 400+。</p>
 */
public final class GrowthLevelRules {

    public static final int EXP_PER_LEVEL = 100;
    public static final int MAX_LEVEL = 5;

    private GrowthLevelRules() {
    }

    /**
     * 当前总经验对应的等级；负数按 0 处理，超过 400 仍为 LV5。
     */
    public static int levelOf(int exp) {
        return Math.min(MAX_LEVEL, Math.max(0, exp) / EXP_PER_LEVEL + 1);
    }

    /**
     * 距下一级所需经验；LV5 已满级时返回 {@code null}。
     */
    public static Integer expToNext(int exp) {
        int normalized = Math.max(0, exp);
        int level = levelOf(normalized);
        return level >= MAX_LEVEL ? null : level * EXP_PER_LEVEL - normalized;
    }

    public static boolean maxLevel(int exp) {
        return levelOf(exp) >= MAX_LEVEL;
    }
}
