package routeme.service;

import java.util.List;

import routeme.enums.WalletEntryTypeEnum;
import routeme.pojo.UserWallet;
import routeme.pojo.WalletLedgerEntry;
import routeme.pojo.WalletPosting;

/**
 * 演示钱包的唯一读写入口：读路径保证钱包存在，写路径只允许经由 debit / credit。
 * 每次余额变化都在同一事务内追加一条 append-only 流水。
 */
public interface WalletService {

    /**
     * 确保钱包存在并返回当前余额；已存在时不改变余额。
     */
    UserWallet ensureWallet(long userId);

    /**
     * 读取当前余额；钱包缺失时按初始余额建立。
     */
    UserWallet read(long userId);

    /**
     * 出账：余额不足抛 409，成功时返回变更后余额与本次流水。
     */
    WalletPosting debit(
            long userId, int amountCents, WalletEntryTypeEnum entryType, String relatedType, String relatedId);

    /**
     * 入账：成功时返回变更后余额与本次流水。
     */
    WalletPosting credit(
            long userId, int amountCents, WalletEntryTypeEnum entryType, String relatedType, String relatedId);

    /**
     * 按 {@code occurred_at ASC, id ASC} 返回全部流水，便于顺序回算余额。
     */
    List<WalletLedgerEntry> ledgerOf(long userId);
}