package routeme.constant;

/**
 * 旅行金融的费率：借款从本金扣除 5% 服务费；保险由第三方定价，RouteMe 不收服务费。
 * 纯整数运算，四舍五入到分：{@code fee = (base * 5 + 50) / 100}。
 */
public final class FinanceFeeConstant {

    public static final int FEE_RATE_PERCENT = 5;

    private FinanceFeeConstant() {
    }

    public static int feeOf(int baseCents) {
        return (baseCents * FEE_RATE_PERCENT + 50) / 100;
    }
}