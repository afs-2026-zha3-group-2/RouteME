package routeme.response;

import java.time.Instant;

import routeme.pojo.WalletLedgerEntry;

/**
 * 钱包流水响应：方向、金额、前后余额、业务类型与关联业务均为只读。
 */
public record WalletLedgerEntryResponse(
        long id,
        String direction,
        int amountCents,
        int balanceBeforeCents,
        int balanceAfterCents,
        String entryType,
        String relatedType,
        String relatedId,
        Instant occurredAt) {

    public static WalletLedgerEntryResponse from(WalletLedgerEntry entry) {
        return new WalletLedgerEntryResponse(
                entry.id(),
                entry.direction().wireValue(),
                entry.amountCents(),
                entry.balanceBeforeCents(),
                entry.balanceAfterCents(),
                entry.entryType().wireValue(),
                entry.relatedType(),
                entry.relatedId(),
                entry.occurredAt());
    }
}