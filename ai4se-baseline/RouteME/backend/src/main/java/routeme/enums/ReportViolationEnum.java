package routeme.enums;

import java.util.Locale;
import java.util.Set;

import routeme.exception.InvalidInputException;

/**
 * 举报违规类型与固定扣分：扣分值只在这里定义，请求不得携带任意分值。
 * {@code OTHER} 的固定值为 0，实际分值由管理员在 -5 / -10 / -20 / -30 中选择。
 */
public enum ReportViolationEnum {
    HARASSMENT(10),
    FAKE_TRIP(15),
    FRAUD_RISK(30),
    ILLEGAL_CONTENT(20),
    IMPERSONATION(20),
    NO_SHOW_DISRUPTION(10),
    PRIVACY_LEAK(30),
    OTHER(0);

    /** {@code OTHER} 允许的扣分档位（正数）。 */
    public static final Set<Integer> OTHER_DEDUCTIONS = Set.of(5, 10, 20, 30);

    private final int fixedDeduction;

    ReportViolationEnum(int fixedDeduction) {
        this.fixedDeduction = fixedDeduction;
    }

    public int fixedDeduction() {
        return fixedDeduction;
    }

    /**
     * 解析并计算本次扣分：非 {@code OTHER} 忽略 {@code otherDeduction}；{@code OTHER} 必须给合法档位。
     */
    public int deduction(Integer otherDeduction) {
        if (this == OTHER) {
            if (otherDeduction == null || !OTHER_DEDUCTIONS.contains(otherDeduction)) {
                throw new InvalidInputException("other_deduction must be one of 5, 10, 20, 30");
            }
            return otherDeduction;
        }
        return fixedDeduction;
    }

    public static ReportViolationEnum parse(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new InvalidInputException("violation_type is required");
        }
        try {
            return valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new InvalidInputException("unsupported violation_type: " + raw);
        }
    }
}
