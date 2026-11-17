package routeme.pojo;

import routeme.enums.CreditLevel;

/**
 * 信用状态只读视图：分数恒在 0–100，等级由分数派生。
 */
public record UserCredit(long userId, int score, CreditLevel level) {

    public static final int MIN_SCORE = 0;
    public static final int MAX_SCORE = 100;
    public static final int INITIAL_SCORE = 80;

    public static UserCredit of(long userId, int score) {
        int clamped = Math.max(MIN_SCORE, Math.min(MAX_SCORE, score));
        return new UserCredit(userId, clamped, CreditLevel.ofScore(clamped));
    }

    public String levelCode() {
        return level.wireValue();
    }
}
