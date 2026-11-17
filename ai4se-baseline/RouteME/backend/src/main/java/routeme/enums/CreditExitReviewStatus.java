package routeme.enums;

/**
 * 退出事件的核实状态：个人原因/≥7 天/旅行中为 not_required；
 * 不可抗力/安全原因为 pending；未来核实为 verified_true / verified_false。
 */
public enum CreditExitReviewStatus {
    NOT_REQUIRED("not_required"),
    PENDING("pending"),
    VERIFIED_TRUE("verified_true"),
    VERIFIED_FALSE("verified_false");

    private final String wireValue;

    CreditExitReviewStatus(String wireValue) {
        this.wireValue = wireValue;
    }

    public String wireValue() {
        return wireValue;
    }

    public static CreditExitReviewStatus parse(String value) {
        for (CreditExitReviewStatus status : values()) {
            if (status.wireValue.equals(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("unsupported review status: " + value);
    }
}
