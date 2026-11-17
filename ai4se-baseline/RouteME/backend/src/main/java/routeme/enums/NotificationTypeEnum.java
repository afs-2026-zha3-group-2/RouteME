package routeme.enums;

/**
 * 通知事件类型。wire 值固定，前端按原值分支；改名等同破坏契约。
 */
public enum NotificationTypeEnum {
    APPLICATION_RECEIVED("application_received"),
    APPLICATION_ACCEPTED("application_accepted"),
    APPLICATION_REJECTED("application_rejected"),
    MESSAGE("message");

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