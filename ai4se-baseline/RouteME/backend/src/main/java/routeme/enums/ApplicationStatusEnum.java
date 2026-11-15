package routeme.enums;

/**
 * 申请状态：PENDING 可取消/处理，ACCEPTED 可退出，REJECTED/CANCELLED 为终态。
 */
public enum ApplicationStatusEnum {
    PENDING("pending"),
    ACCEPTED("accepted"),
    REJECTED("rejected"),
    CANCELLED("cancelled");

    private final String wireValue;

    ApplicationStatusEnum(String wireValue) {
        this.wireValue = wireValue;
    }

    public String wireValue() {
        return wireValue;
    }
}