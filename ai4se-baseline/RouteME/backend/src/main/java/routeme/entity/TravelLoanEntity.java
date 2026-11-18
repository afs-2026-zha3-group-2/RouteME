package routeme.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

/**
 * travel_loan 行对象：ACTIVE 时 active_user_id = user_id，REPAID 时置 NULL 释放唯一索引。
 */
@TableName("travel_loan")
public class TravelLoanEntity {

    @TableId(type = IdType.INPUT)
    private Long id;

    private Long userId;

    private Long tripId;

    private Integer principalCents;

    private Integer serviceFeeCents;

    private Integer disbursedCents;

    private Integer repayCents;

    private Integer termDays;

    private String status;

    private Long activeUserId;

    private String fundedAt;

    private String dueAt;

    private String repaidAt;

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

    public Long getTripId() {
        return tripId;
    }

    public void setTripId(Long tripId) {
        this.tripId = tripId;
    }

    public Integer getPrincipalCents() {
        return principalCents;
    }

    public void setPrincipalCents(Integer principalCents) {
        this.principalCents = principalCents;
    }

    public Integer getServiceFeeCents() {
        return serviceFeeCents;
    }

    public void setServiceFeeCents(Integer serviceFeeCents) {
        this.serviceFeeCents = serviceFeeCents;
    }

    public Integer getDisbursedCents() {
        return disbursedCents;
    }

    public void setDisbursedCents(Integer disbursedCents) {
        this.disbursedCents = disbursedCents;
    }

    public Integer getRepayCents() {
        return repayCents;
    }

    public void setRepayCents(Integer repayCents) {
        this.repayCents = repayCents;
    }

    public Integer getTermDays() {
        return termDays;
    }

    public void setTermDays(Integer termDays) {
        this.termDays = termDays;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Long getActiveUserId() {
        return activeUserId;
    }

    public void setActiveUserId(Long activeUserId) {
        this.activeUserId = activeUserId;
    }

    public String getFundedAt() {
        return fundedAt;
    }

    public void setFundedAt(String fundedAt) {
        this.fundedAt = fundedAt;
    }

    public String getDueAt() {
        return dueAt;
    }

    public void setDueAt(String dueAt) {
        this.dueAt = dueAt;
    }

    public String getRepaidAt() {
        return repaidAt;
    }

    public void setRepaidAt(String repaidAt) {
        this.repaidAt = repaidAt;
    }
}