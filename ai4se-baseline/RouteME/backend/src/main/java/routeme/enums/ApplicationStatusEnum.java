package routeme.enums;

/**
 * 申请状态：PENDING 可取消/处理，ACCEPTED 可退出，REJECTED/CANCELLED 为终态；
 * LEFT 表示已接受的同行者主动退出，保留会话与历史，且仍可重新申请。
 */
public enum ApplicationStatusEnum {
    PENDING("pending"),
    ACCEPTED("accepted"),
    REJECTED("rejected"),
    CANCELLED("cancelled"),
    LEFT("left");

    private final String wireValue;

    ApplicationStatusEnum(String wireValue) {
        this.wireValue = wireValue;
    }

    public String wireValue() {
        return wireValue;
    }
}