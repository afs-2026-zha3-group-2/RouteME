package routeme.enums;

/**
 * 通知点击后的跳转目标种类；由类型与事件派生，前端按 kind 组装路由。
 */
public enum NotificationTargetKindEnum {
    TRIP("trip"),
    APPLICATIONS("applications"),
    CHAT("chat"),
    CREDIT("credit"),
    REPORT("report"),
    ACCOUNT("account"),
    SUPPORT("support"),
    IDENTITY("identity");

    private final String wireValue;

    NotificationTargetKindEnum(String wireValue) {
        this.wireValue = wireValue;
    }

    public String wireValue() {
        return wireValue;
    }
}