package routeme.enums;

/**
 * 信用等级：由分数实时派生，不落库。
 * 区间左闭右开、首尾相接：excellent 90–100、good 80–89、fair 60–79、low 30–59、risk 0–29。
 */
public enum CreditLevel {
    EXCELLENT("excellent", 90),
    GOOD("good", 80),
    FAIR("fair", 60),
    LOW("low", 30),
    RISK("risk", 0);

    private final String wireValue;
    private final int minScore;

    CreditLevel(String wireValue, int minScore) {
        this.wireValue = wireValue;
        this.minScore = minScore;
    }

    public String wireValue() {
        return wireValue;
    }

    public int minScore() {
        return minScore;
    }

    /**
     * 唯一的阈值派生入口；调用方必须先保证分数落在 0–100。
     */
    public static CreditLevel ofScore(int score) {
        for (CreditLevel level : values()) {
            if (score >= level.minScore) {
                return level;
            }
        }
        return RISK;
    }
}
