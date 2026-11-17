package routeme.constant;

import java.util.List;

/**
 * 安全学习恢复信用分的边界值（REQ-022）。
 *
 * <p>恢复目标分 60 只在这里定义：拦截面与恢复端一律引用本常量，不写字面量。</p>
 */
public final class CreditLearningConstant {

    /** 恢复目标分：通过后把分数补到这里；同时也是发布行程的最低分门槛。 */
    public static final int RECOVERY_TARGET_SCORE = 60;
    /** 发布行程的最低分：小于它才拦，等于它放行（与恢复目标同值，只在这里定义）。 */
    public static final int PUBLISH_MIN_SCORE = RECOVERY_TARGET_SCORE;
    /** 通过线：答对 8 题及以上算通过。 */
    public static final int PASS_LINE = 8;
    /** 每次考试的题数。 */
    public static final int QUESTION_COUNT = 10;
    /** 题库总题数与每类题数。 */
    public static final int BANK_SIZE = 20;
    public static final int QUESTIONS_PER_CATEGORY = 5;
    /** 每题选项数。 */
    public static final int OPTION_COUNT = 4;
    /** 每自然月考试次数上限。 */
    public static final int EXAMS_PER_MONTH = 2;

    /** 四类题目，抽题时每类保底各 1 题。 */
    public static final List<String> CATEGORIES = List.of(
            "travel_safety", "stranger_companion", "platform_rules", "privacy");

    public static final String STATUS_STARTED = "started";
    public static final String STATUS_SUBMITTED = "submitted";

    public static final String REASON_SAFETY_LEARNING_RECOVERY = "SAFETY_LEARNING_RECOVERY";
    public static final String RELATED_TYPE_LEARNING_SESSION = "CREDIT_LEARNING_SESSION";

    private CreditLearningConstant() {
    }
}
