package routeme.enums;

/**
 * 通知类型（业务域）。wire 值固定为契约中的大写枚举；前端按原值分组与跳转。
 */
public enum NotificationTypeEnum {
    TRIP("TRIP"),
    APPLICATION("APPLICATION"),
    CHAT("CHAT"),
    CREDIT("CREDIT"),
    REPORT("REPORT"),
    ACCOUNT("ACCOUNT"),
    SERVICE("SERVICE"),
    SYSTEM("SYSTEM");

    private final String wireValue;

    NotificationTypeEnum(String wireValue) {
        this.wireValue = wireValue;
    }

    public String wireValue() {
        return wireValue;
    }

    /**
     * wire 值反解。
     *
     * @param wireValue 契约中的类型值
     * @return 对应枚举
     * @throws IllegalArgumentException 未知类型（数据库出现脏值时尽早暴露）
     */
    public static NotificationTypeEnum fromWire(String wireValue) {
        for (NotificationTypeEnum type : values()) {
            if (type.wireValue.equals(wireValue)) {
                return type;
            }
        }
        throw new IllegalArgumentException("unknown notification type: " + wireValue);
    }
}