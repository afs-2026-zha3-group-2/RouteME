package routeme.response;

import java.util.List;

/**
 * 账号聚合页响应：当前用户的钱包、流水、全部保单与全部借款。
 */
public record MyFinanceResponse(
        WalletResponse wallet,
        List<WalletLedgerEntryResponse> ledger,
        List<InsurancePolicyResponse> policies,
        List<TravelLoanResponse> loans) {
}