package routeme.enums;

/**
 * 通知状态。落库只存 {@code read_at}；状态由是否已读派生，READ 不再计入未读。
 */
public enum NotificationStatusEnum {
    UNREAD("UNREAD"),
    READ("READ");

    private final String wireValue;

    NotificationStatusEnum(String wireValue) {
        this.wireValue = wireValue;
    }

    public String wireValue() {
        return wireValue;
    }
}