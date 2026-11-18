package routeme.entity;

import java.time.Instant;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import routeme.enums.CreditRestrictionStatusEnum;
import routeme.enums.CreditRestrictionTypeEnum;
import routeme.pojo.CreditRestriction;

/**
 * credit_restriction 行对象：active_flag=1 为 active，NULL 为已解除。
 */
@TableName("credit_restriction")
public class CreditRestrictionEntity {

    @TableId(type = IdType.INPUT)
    private Long id;
    private Long userId;
    private String type;
    private String triggerReason;
    private Integer triggerScore;
    private String triggeredAt;
    private String status;
    private Integer activeFlag;
    private String liftedAt;
    private String liftReason;
    private Long triggerLedgerId;

    public static CreditRestrictionEntity from(CreditRestriction restriction) {
        CreditRestrictionEntity entity = new CreditRestrictionEntity();
        entity.id = restriction.id();
        entity.userId = restriction.userId();
        entity.type = restriction.type().wireValue();
        entity.triggerReason = restriction.triggerReason();
        entity.triggerScore = restriction.triggerScore();
        entity.triggeredAt = restriction.triggeredAt().toString();
        entity.status = restriction.status().wireValue();
        entity.activeFlag = restriction.status() == CreditRestrictionStatusEnum.ACTIVE ? 1 : null;
        entity.liftedAt = restriction.liftedAt() == null ? null : restriction.liftedAt().toString();
        entity.liftReason = restriction.liftReason();
        entity.triggerLedgerId = restriction.triggerLedgerId();
        return entity;
    }

    public CreditRestriction toRestriction() {
        return new CreditRestriction(
                id,
                userId,
                CreditRestrictionTypeEnum.valueOf(type.toUpperCase()),
                triggerReason,
                triggerScore,
                Instant.parse(triggeredAt),
                CreditRestrictionStatusEnum.parse(status),
                liftedAt == null ? null : Instant.parse(liftedAt),
                liftReason,
                triggerLedgerId);
    }

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

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getTriggerReason() {
        return triggerReason;
    }

    public void setTriggerReason(String triggerReason) {
        this.triggerReason = triggerReason;
    }

    public Integer getTriggerScore() {
        return triggerScore;
    }

    public void setTriggerScore(Integer triggerScore) {
        this.triggerScore = triggerScore;
    }

    public String getTriggeredAt() {
        return triggeredAt;
    }

    public void setTriggeredAt(String triggeredAt) {
        this.triggeredAt = triggeredAt;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Integer getActiveFlag() {
        return activeFlag;
    }

    public void setActiveFlag(Integer activeFlag) {
        this.activeFlag = activeFlag;
    }

    public String getLiftedAt() {
        return liftedAt;
    }

    public void setLiftedAt(String liftedAt) {
        this.liftedAt = liftedAt;
    }

    public String getLiftReason() {
        return liftReason;
    }

    public void setLiftReason(String liftReason) {
        this.liftReason = liftReason;
    }

    public Long getTriggerLedgerId() {
        return triggerLedgerId;
    }

    public void setTriggerLedgerId(Long triggerLedgerId) {
        this.triggerLedgerId = triggerLedgerId;
    }
}
