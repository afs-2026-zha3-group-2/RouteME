package routeme.enums;

/**
 * 路线完成度信誉状态：由完成度数值与样本数实时派生，不落库。
 * <ul>
 *   <li>{@code good}：80–100；</li>
 *   <li>{@code neutral}：70–79；</li>
 *   <li>{@code watch}：0–69；</li>
 *   <li>{@code insufficient}：无有效数值或样本不足。</li>
 * </ul>
 */
public enum RouteCompletionState {
    GOOD("good"),
    NEUTRAL("neutral"),
    WATCH("watch"),
    INSUFFICIENT("insufficient");

    private final String wireValue;

    RouteCompletionState(String wireValue) {
        this.wireValue = wireValue;
    }

    public String wireValue() {
        return wireValue;
    }
}
