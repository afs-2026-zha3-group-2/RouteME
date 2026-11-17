package routeme.enums;

/**
 * 退出预览 / 结果的展示码；前端只做文案映射，不重复计算扣分。
 */
public enum CreditExitMessageCode {
    PENALTY("penalty"),
    PENALTY_DOUBLED("penalty_doubled"),
    NO_PENALTY("no_penalty"),
    DURING_TRIP("during_trip"),
    PENDING_REVIEW("pending_review"),
    AT_FLOOR("at_floor");

    private final String wireValue;

    CreditExitMessageCode(String wireValue) {
        this.wireValue = wireValue;
    }

    public String wireValue() {
        return wireValue;
    }
}
