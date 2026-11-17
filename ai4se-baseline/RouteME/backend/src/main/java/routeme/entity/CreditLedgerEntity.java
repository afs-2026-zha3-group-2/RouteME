package routeme.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

/**
 * credit_ledger 行对象：append-only；{@code scoreBefore + appliedDelta = scoreAfter}。
 */
@TableName("credit_ledger")
public class CreditLedgerEntity {

    @TableId(type = IdType.INPUT)
    private Long id;

    private Long userId;

    private String reasonCode;

    private Integer appliedDelta;

    private Integer scoreBefore;

    private Integer scoreAfter;

    private String relatedType;

    private String relatedId;

    private String idempotencyKey;

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

    public String getReasonCode() {
        return reasonCode;
    }

    public void setReasonCode(String reasonCode) {
        this.reasonCode = reasonCode;
    }

    public Integer getAppliedDelta() {
        return appliedDelta;
    }

    public void setAppliedDelta(Integer appliedDelta) {
        this.appliedDelta = appliedDelta;
    }

    public Integer getScoreBefore() {
        return scoreBefore;
    }

    public void setScoreBefore(Integer scoreBefore) {
        this.scoreBefore = scoreBefore;
    }

    public Integer getScoreAfter() {
        return scoreAfter;
    }

    public void setScoreAfter(Integer scoreAfter) {
        this.scoreAfter = scoreAfter;
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

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }

    public String getOccurredAt() {
        return occurredAt;
    }

    public void setOccurredAt(String occurredAt) {
        this.occurredAt = occurredAt;
    }
}
