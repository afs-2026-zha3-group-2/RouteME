package routeme.utils;

/**
 * 信用相关的幂等键拼装。
 *
 * <p>恢复幂等键落在 {@code credit_ledger.idempotency_key} 唯一索引上，
 * 因此「同一用户同一自然月只恢复一次」由数据库唯一约束保证，不依赖行锁。</p>
 */
public final class CreditLearningKey {

    private static final String RECOVERY_PREFIX = "learning-recovery:";

    private CreditLearningKey() {
    }

    public static String recoveryKey(long userId, String monthKey) {
        return RECOVERY_PREFIX + userId + ":" + monthKey;
    }
}
