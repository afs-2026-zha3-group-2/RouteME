package routeme.enums;

import routeme.exception.InvalidInputException;

/**
 * 取消行程的固定原因字典。wire 值与契约 TripCancelRequest.reason 一一对应；
 * credit_restricted 为系统原因，只能由信用限制清退写入，发布者请求不可选。
 */
public enum TripCancelReasonEnum {
    PERSONAL("personal", "个人原因无法出行", false),
    TIME_CHANGED("time_changed", "行程时间发生变化", false),
    PLAN_CHANGED("plan_changed", "行程计划发生变化", false),
    NOT_ENOUGH_PEOPLE("not_enough_people", "同行人数不足", false),
    WEATHER("weather", "天气或不可抗力原因", false),
    ILLNESS("illness", "突发疾病或受伤", false),
    SAFETY("safety", "安全原因", false),
    OTHER("other", "其他原因", false),
    CREDIT_RESTRICTED("credit_restricted", "信用分低于 60，账号受限", true);

    private final String wireValue;
    private final String label;
    private final boolean systemOnly;

    TripCancelReasonEnum(String wireValue, String label, boolean systemOnly) {
        this.wireValue = wireValue;
        this.label = label;
        this.systemOnly = systemOnly;
    }

    public String wireValue() {
        return wireValue;
    }

    public String label() {
        return label;
    }

    public boolean systemOnly() {
        return systemOnly;
    }

    public static TripCancelReasonEnum parse(String value) {
        if (value == null || value.isBlank()) {
            throw new InvalidInputException("cancel reason is required");
        }
        for (TripCancelReasonEnum reason : values()) {
            if (!reason.systemOnly && reason.wireValue.equals(value.trim())) {
                return reason;
            }
        }
        throw new InvalidInputException("cancel reason is not supported");
    }
}
