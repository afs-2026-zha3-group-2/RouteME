package routeme.enums;

/**
 * 信用限制记录状态：active / lifted；历史记录保留。
 */
public enum CreditRestrictionStatusEnum {
    ACTIVE("active"),
    LIFTED("lifted");

    private final String wireValue;

    CreditRestrictionStatusEnum(String wireValue) {
        this.wireValue = wireValue;
    }

    public String wireValue() {
        return wireValue;
    }

    public static CreditRestrictionStatusEnum parse(String value) {
        for (CreditRestrictionStatusEnum status : values()) {
            if (status.wireValue.equals(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("unsupported restriction status: " + value);
    }
}
