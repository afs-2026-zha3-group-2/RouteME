package routeme.enums;

/**
 * 通知优先级。{@code HIGH} 用于信用分低于 60 等需要立即关注的事件。
 */
public enum NotificationPriorityEnum {
    NORMAL("NORMAL"),
    HIGH("HIGH");

    private final String wireValue;

    NotificationPriorityEnum(String wireValue) {
        this.wireValue = wireValue;
    }

    public String wireValue() {
        return wireValue;
    }
}