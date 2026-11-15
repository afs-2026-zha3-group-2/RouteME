package routeme.model;

/**
 * 行程状态：由完成时间与人数推导，不是独立写入的列。
 */
public enum TripStatus {
    RECRUITING("recruiting", "招募中"),
    FULL("full", "已满员"),
    COMPLETED("completed", "已结束");

    private final String wireValue;
    private final String label;

    TripStatus(String wireValue, String label) {
        this.wireValue = wireValue;
        this.label = label;
    }

    public String wireValue() {
        return wireValue;
    }

    public String label() {
        return label;
    }
}