package routeme.response;

import routeme.pojo.UserWallet;

/**
 * 钱包响应：余额为整数分（CNY）。
 */
public record WalletResponse(int balanceCents) {

    public static WalletResponse from(UserWallet wallet) {
        return new WalletResponse(wallet.balanceCents());
    }
}