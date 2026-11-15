package routeme.model;

/**
 * 申请状态：PENDING 可取消/处理，ACCEPTED 可退出，REJECTED/CANCELLED 为终态。
 */
public enum ApplicationStatus {
    PENDING("pending"),
    ACCEPTED("accepted"),
    REJECTED("rejected"),
    CANCELLED("cancelled");

    private final String wireValue;

    ApplicationStatus(String wireValue) {
        this.wireValue = wireValue;
    }

    public String wireValue() {
        return wireValue;
    }
}