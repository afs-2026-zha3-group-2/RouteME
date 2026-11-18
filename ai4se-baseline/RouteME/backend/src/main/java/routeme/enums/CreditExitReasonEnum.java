package routeme.enums;

import routeme.exception.InvalidInputException;

/**
 * 退出同行原因：个人原因 / 不可抗力 / 安全原因。
 * 不可抗力与安全原因暂不扣分并进入待核实。
 */
public enum CreditExitReasonEnum {
    PERSONAL("personal", "个人原因"),
    FORCE_MAJEURE("force_majeure", "不可抗力"),
    SAFETY("safety", "安全原因");

    private final String wireValue;
    private final String label;

    CreditExitReasonEnum(String wireValue, String label) {
        this.wireValue = wireValue;
        this.label = label;
    }

    public String wireValue() {
        return wireValue;
    }

    public String label() {
        return label;
    }

    public boolean needsReview() {
        return this != PERSONAL;
    }

    public static CreditExitReasonEnum parse(String value) {
        if (value == null || value.isBlank()) {
            throw new InvalidInputException("leave reason is required");
        }
        for (CreditExitReasonEnum reason : values()) {
            if (reason.wireValue.equals(value.trim())) {
                return reason;
            }
        }
        throw new InvalidInputException("leave reason is not supported");
    }
}
