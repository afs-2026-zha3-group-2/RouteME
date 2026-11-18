package routeme.enums;

/**
 * 钱包流水的业务类型：借款发放 / 还款。落库用常量名，响应输出 wire 值。
 */
public enum WalletEntryTypeEnum {
    LOAN_DISBURSEMENT("loan_disbursement"),
    LOAN_REPAYMENT("loan_repayment");

    private final String wireValue;

    WalletEntryTypeEnum(String wireValue) {
        this.wireValue = wireValue;
    }

    public String wireValue() {
        return wireValue;
    }

    public static WalletEntryTypeEnum ofCode(String code) {
        for (WalletEntryTypeEnum type : values()) {
            if (type.name().equals(code)) {
                return type;
            }
        }
        throw new IllegalArgumentException("unknown wallet entry type: " + code);
    }
}