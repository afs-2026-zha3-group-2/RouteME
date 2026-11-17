package routeme.enums;

/**
 * 推荐分项的维度：目的地、出发日期与共同兴趣。
 * 线值用于契约与前端展示判定，不随文案变化。
 */
public enum RecommendationDimensionEnum {
    DESTINATION("destination"),
    DATE("date"),
    INTEREST("interest");

    private final String wireValue;

    RecommendationDimensionEnum(String wireValue) {
        this.wireValue = wireValue;
    }

    public String wireValue() {
        return wireValue;
    }
}