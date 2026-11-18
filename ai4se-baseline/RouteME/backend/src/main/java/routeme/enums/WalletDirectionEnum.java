package routeme.enums;

/**
 * 钱包流水方向：CREDIT 入账 / DEBIT 出账。落库用常量名，响应输出 wire 值。
 */
public enum WalletDirectionEnum {
    CREDIT("credit"),
    DEBIT("debit");

    private final String wireValue;

    WalletDirectionEnum(String wireValue) {
        this.wireValue = wireValue;
    }

    public String wireValue() {
        return wireValue;
    }

    public static WalletDirectionEnum ofCode(String code) {
        for (WalletDirectionEnum direction : values()) {
            if (direction.name().equals(code)) {
                return direction;
            }
        }
        throw new IllegalArgumentException("unknown wallet direction: " + code);
    }
}