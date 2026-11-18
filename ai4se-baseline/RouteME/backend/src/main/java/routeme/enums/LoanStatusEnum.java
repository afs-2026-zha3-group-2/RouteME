package routeme.enums;

/**
 * 借款状态：落库只有 ACTIVE / REPAID；OVERDUE 只由读取时刻对 due_at 派生，不入库。
 */
public enum LoanStatusEnum {
    ACTIVE("active"),
    REPAID("repaid"),
    OVERDUE("overdue");

    private final String wireValue;

    LoanStatusEnum(String wireValue) {
        this.wireValue = wireValue;
    }

    public String wireValue() {
        return wireValue;
    }

    public static LoanStatusEnum ofCode(String code) {
        for (LoanStatusEnum status : values()) {
            if (status.name().equals(code)) {
                return status;
            }
        }
        throw new IllegalArgumentException("unknown loan status: " + code);
    }
}