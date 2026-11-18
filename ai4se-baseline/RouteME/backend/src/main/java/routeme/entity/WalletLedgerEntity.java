package routeme.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

/**
 * wallet_ledger 行对象：append-only；{@code balanceBefore ± amount = balanceAfter}。
 */
@TableName("wallet_ledger")
public class WalletLedgerEntity {

    @TableId(type = IdType.INPUT)
    private Long id;

    private Long userId;

    private String direction;

    private Integer amountCents;

    private Integer balanceBeforeCents;

    private Integer balanceAfterCents;

    private String entryType;

    private String relatedType;

    private String relatedId;

    private String occurredAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getDirection() {
        return direction;
    }

    public void setDirection(String direction) {
        this.direction = direction;
    }

    public Integer getAmountCents() {
        return amountCents;
    }

    public void setAmountCents(Integer amountCents) {
        this.amountCents = amountCents;
    }

    public Integer getBalanceBeforeCents() {
        return balanceBeforeCents;
    }

    public void setBalanceBeforeCents(Integer balanceBeforeCents) {
        this.balanceBeforeCents = balanceBeforeCents;
    }

    public Integer getBalanceAfterCents() {
        return balanceAfterCents;
    }

    public void setBalanceAfterCents(Integer balanceAfterCents) {
        this.balanceAfterCents = balanceAfterCents;
    }

    public String getEntryType() {
        return entryType;
    }

    public void setEntryType(String entryType) {
        this.entryType = entryType;
    }

    public String getRelatedType() {
        return relatedType;
    }

    public void setRelatedType(String relatedType) {
        this.relatedType = relatedType;
    }

    public String getRelatedId() {
        return relatedId;
    }

    public void setRelatedId(String relatedId) {
        this.relatedId = relatedId;
    }

    public String getOccurredAt() {
        return occurredAt;
    }

    public void setOccurredAt(String occurredAt) {
        this.occurredAt = occurredAt;
    }
}