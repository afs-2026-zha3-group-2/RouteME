package routeme.pojo;

/**
 * 一次信用分变化请求：理论变化量由调用方给出，实际生效量由记账服务裁断后计算。
 * {@code idempotencyKey} 为空表示不做幂等约束（例如内部初始化与测试用例）。
 */
public record CreditBooking(
        long userId,
        String reasonCode,
        int delta,
        String relatedType,
        String relatedId,
        String idempotencyKey) {

    public static CreditBooking of(long userId, String reasonCode, int delta) {
        return new CreditBooking(userId, reasonCode, delta, null, null, null);
    }
}
