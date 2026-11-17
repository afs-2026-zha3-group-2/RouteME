package routeme.enums;

/**
 * 信用记录的原因码 → 展示文案。文案只在这里定义，前端不重复映射。
 *
 * <p>当前只有安全学习恢复一种原因码；扣分 / 加分事件（#29–#31）落地时在此追加。</p>
 */
public enum CreditReason {
    SAFETY_LEARNING_RECOVERY("SAFETY_LEARNING_RECOVERY", "安全学习信用恢复");

    private final String code;
    private final String label;

    CreditReason(String code, String label) {
        this.code = code;
        this.label = label;
    }

    public String code() {
        return code;
    }

    public String label() {
        return label;
    }

    /**
     * @return 已登记原因码的文案；未登记时回退到原因码本身，便于新事件先落库再补文案。
     */
    public static String labelOf(String code) {
        for (CreditReason reason : values()) {
            if (reason.code.equals(code)) {
                return reason.label;
            }
        }
        return code;
    }
}
