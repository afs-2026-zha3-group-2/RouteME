package routeme.constant;

import java.util.List;

/**
 * 体验获赞的信用结算口径（REQ-022）。
 *
 * <p>每个档位首次跨过时结算 +1；同行程同作者取最大单篇赞数判定；月度按实发消耗、
 * 截断不结转；时区与行程业务日期一致（Asia/Shanghai）。</p>
 */
public final class ExperienceLikeConstant {

    public static final List<Integer> TIERS = List.of(5, 10, 15, 20, 25);

    public static final int MONTHLY_LIMIT = 20;

    public static final int PER_TIER_DELTA = 1;

    public static final String REASON_CODE = "EXPERIENCE_LIKE";

    public static final String RELATED_TYPE = "TRIP";

    private ExperienceLikeConstant() {
    }

    /**
     * 同一行程同一作者同一档位只结算一次；跨行程或跨档位互不影响。
     */
    public static String idempotencyKey(long tripId, long authorId, int tier) {
        return idempotencyPrefix(tripId, authorId) + tier;
    }

    /**
     * 已锁定档位的查询前缀：命中即表示该档位已经写过账本（含实发 0 的截断行）。
     */
    public static String idempotencyPrefix(long tripId, long authorId) {
        return REASON_CODE + ":" + tripId + ":" + authorId + ":";
    }
}
