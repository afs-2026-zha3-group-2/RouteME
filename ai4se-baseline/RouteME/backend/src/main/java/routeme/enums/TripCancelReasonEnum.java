package routeme.enums;

import routeme.exception.InvalidInputException;

/**
 * 取消行程的固定原因字典。wire 值与契约 TripCancelRequest.reason 一一对应。
 */
public enum TripCancelReasonEnum {
    PERSONAL("personal", "个人原因无法出行"),
    TIME_CHANGED("time_changed", "行程时间发生变化"),
    PLAN_CHANGED("plan_changed", "行程计划发生变化"),
    NOT_ENOUGH_PEOPLE("not_enough_people", "同行人数不足"),
    WEATHER("weather", "天气或不可抗力原因"),
    ILLNESS("illness", "突发疾病或受伤"),
    SAFETY("safety", "安全原因"),
    OTHER("other", "其他原因");

    private final String wireValue;
    private final String label;

    TripCancelReasonEnum(String wireValue, String label) {
        this.wireValue = wireValue;
        this.label = label;
    }

    public String wireValue() {
        return wireValue;
    }

    public String label() {
        return label;
    }

    public static TripCancelReasonEnum parse(String value) {
        if (value == null || value.isBlank()) {
            throw new InvalidInputException("cancel reason is required");
        }
        for (TripCancelReasonEnum reason : values()) {
            if (reason.wireValue.equals(value.trim())) {
                return reason;
            }
        }
        throw new InvalidInputException("cancel reason is not supported");
    }
}
