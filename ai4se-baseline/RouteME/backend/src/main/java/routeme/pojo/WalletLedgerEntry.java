package routeme.pojo;

import java.time.Instant;

import routeme.enums.WalletDirectionEnum;
import routeme.enums.WalletEntryTypeEnum;

/**
 * 一条 append-only 钱包流水；{@code balanceBefore ± amount = balanceAfter}。
 *
 * <p>{@code relatedType} 取契约 wire 值（insurance_policy / travel_loan），
 * {@code relatedId} 为对应业务主键的字符串形式。</p>
 */
public record WalletLedgerEntry(
        long id,
        long userId,
        WalletDirectionEnum direction,
        int amountCents,
        int balanceBeforeCents,
        int balanceAfterCents,
        WalletEntryTypeEnum entryType,
        String relatedType,
        String relatedId,
        Instant occurredAt) {
}