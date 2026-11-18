package routeme.pojo;

/**
 * 一次余额变更的结果：变更后的钱包与本次追加的流水。
 */
public record WalletPosting(UserWallet wallet, WalletLedgerEntry entry) {
}