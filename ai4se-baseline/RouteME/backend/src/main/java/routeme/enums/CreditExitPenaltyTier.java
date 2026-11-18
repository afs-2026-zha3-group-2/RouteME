package routeme.enums;

import java.time.Duration;

/**
 * 出发前退出扣分档位，区间左闭右开：
 * ge7d ≥7 天 / d3to7d [3 天, 7 天) / h24to72 [24 小时, 3 天) /
 * h12to24 [12 小时, 24 小时) / lt12h [0, 12 小时) / during 旅行中。
 */
public enum CreditExitPenaltyTier {
    GE7D("ge7d", 0, false),
    D3TO7D("d3to7d", -3, true),
    H24TO72("h24to72", -5, true),
    H12TO24("h12to24", -8, true),
    LT12H("lt12h", -10, true),
    DURING("during", -15, false);

    private static final Duration SEVEN_DAYS = Duration.ofDays(7);
    private static final Duration THREE_DAYS = Duration.ofDays(3);
    private static final Duration TWENTY_FOUR_HOURS = Duration.ofHours(24);
    private static final Duration TWELVE_HOURS = Duration.ofHours(12);

    private final String wireValue;
    private final int baseDelta;
    /** 是否计入当月出发前退出次数；ge7d / during 不计入。 */
    private final boolean countsForMonthlyOrdinal;

    CreditExitPenaltyTier(String wireValue, int baseDelta, boolean countsForMonthlyOrdinal) {
        this.wireValue = wireValue;
        this.baseDelta = baseDelta;
        this.countsForMonthlyOrdinal = countsForMonthlyOrdinal;
    }

    public String wireValue() {
        return wireValue;
    }

    public int baseDelta() {
        return baseDelta;
    }

    public boolean countsForMonthlyOrdinal() {
        return countsForMonthlyOrdinal;
    }

    /**
     * 距出发时间（departure - now）落入哪个档位；now 已达到/超过出发为 during。
     */
    public static CreditExitPenaltyTier of(Duration untilDeparture) {
        if (untilDeparture.isNegative() || untilDeparture.isZero()) {
            return DURING;
        }
        if (untilDeparture.compareTo(SEVEN_DAYS) >= 0) {
            return GE7D;
        }
        if (untilDeparture.compareTo(THREE_DAYS) >= 0) {
            return D3TO7D;
        }
        if (untilDeparture.compareTo(TWENTY_FOUR_HOURS) >= 0) {
            return H24TO72;
        }
        if (untilDeparture.compareTo(TWELVE_HOURS) >= 0) {
            return H12TO24;
        }
        return LT12H;
    }

    public static CreditExitPenaltyTier parse(String value) {
        for (CreditExitPenaltyTier tier : values()) {
            if (tier.wireValue.equals(value)) {
                return tier;
            }
        }
        throw new IllegalArgumentException("unsupported penalty tier: " + value);
    }
}
