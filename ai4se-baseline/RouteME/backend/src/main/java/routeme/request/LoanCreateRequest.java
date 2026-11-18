package routeme.request;

/**
 * 借款申请：本金必须为 100–2,000 元的整元金额，期限仅 7 / 14 / 30 天。
 * 到期时刻与费用均由服务端计算，客户端额外字段被忽略。
 */
public record LoanCreateRequest(Integer principalCents, Integer termDays) {
}