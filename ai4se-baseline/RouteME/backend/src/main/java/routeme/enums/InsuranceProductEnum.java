package routeme.enums;

/**
 * 第三方保险服务的保障类别（只做展示，不含价格与保额）。
 *
 * <p>RouteMe 不设计保险产品、不计算保费；具体保障项目与免责范围以第三方
 * 保险服务提供方的正式条款为准。</p>
 */
public enum InsuranceProductEnum {
    ACCIDENT_MEDICAL(
            "accident_medical",
            "意外伤害与意外医疗",
            "覆盖意外身故 / 伤残与意外医疗，具体保额与免赔额以第三方条款为准。"),
    EMERGENCY_RESCUE(
            "emergency_rescue",
            "紧急救援",
            "提供紧急医疗转运与旅行救援协调，具体范围以第三方条款为准。"),
    TRAVEL_BAGGAGE(
            "travel_baggage",
            "行李与旅行相关保障",
            "覆盖行李延误 / 丢失等旅行不便，具体范围以第三方条款为准。");

    private final String wireValue;
    private final String label;
    private final String summary;

    InsuranceProductEnum(String wireValue, String label, String summary) {
        this.wireValue = wireValue;
        this.label = label;
        this.summary = summary;
    }

    public String wireValue() {
        return wireValue;
    }

    public String label() {
        return label;
    }

    public String summary() {
        return summary;
    }
}