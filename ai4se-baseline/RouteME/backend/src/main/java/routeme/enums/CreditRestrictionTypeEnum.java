package routeme.enums;

/**
 * 信用限制类型：本 change 只产生 auto_credit；manual_ban 预留给未来管理员封禁。
 */
public enum CreditRestrictionTypeEnum {
    AUTO_CREDIT("auto_credit"),
    MANUAL_BAN("manual_ban");

    private final String wireValue;

    CreditRestrictionTypeEnum(String wireValue) {
        this.wireValue = wireValue;
    }

    public String wireValue() {
        return wireValue;
    }
}
