package routeme.entity;

import java.time.Instant;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import routeme.enums.CreditExitPenaltyTier;
import routeme.enums.CreditExitReasonEnum;
import routeme.enums.CreditExitReviewStatus;
import routeme.pojo.CreditExitEvent;

/**
 * credit_exit_event 行对象：一次退出事件，含档位、月度序号、待核实与账本关联。
 */
@TableName("credit_exit_event")
public class CreditExitEventEntity {

    @TableId(type = IdType.INPUT)
    private Long id;
    private Long userId;
    private Long tripId;
    private Long applicationId;
    private String exitReason;
    private String exitAt;
    private String departureBasisAt;
    private String penaltyTier;
    private Integer theoreticalDelta;
    private Integer appliedDelta;
    private Integer monthlyOrdinal;
    private String reviewStatus;
    private String exitNote;
    private String reviewedAt;
    private Long ledgerId;
    private String idempotencyKey;
    private String createdAt;

    public static CreditExitEventEntity from(CreditExitEvent event) {
        CreditExitEventEntity entity = new CreditExitEventEntity();
        entity.id = event.id();
        entity.userId = event.userId();
        entity.tripId = event.tripId();
        entity.applicationId = event.applicationId();
        entity.exitReason = event.reason().wireValue();
        entity.exitAt = event.exitAt().toString();
        entity.departureBasisAt = event.departureBasisAt().toString();
        entity.penaltyTier = event.penaltyTier().wireValue();
        entity.theoreticalDelta = event.theoreticalDelta();
        entity.appliedDelta = event.appliedDelta();
        entity.monthlyOrdinal = event.monthlyOrdinal();
        entity.reviewStatus = event.reviewStatus().wireValue();
        entity.exitNote = event.exitNote();
        entity.reviewedAt = event.reviewedAt() == null ? null : event.reviewedAt().toString();
        entity.ledgerId = event.ledgerId();
        entity.idempotencyKey = event.idempotencyKey();
        entity.createdAt = event.createdAt().toString();
        return entity;
    }

    public CreditExitEvent toEvent() {
        return new CreditExitEvent(
                id,
                userId,
                tripId,
                applicationId,
                CreditExitReasonEnum.parse(exitReason),
                Instant.parse(exitAt),
                Instant.parse(departureBasisAt),
                CreditExitPenaltyTier.parse(penaltyTier),
                theoreticalDelta,
                appliedDelta,
                monthlyOrdinal,
                CreditExitReviewStatus.parse(reviewStatus),
                exitNote,
                reviewedAt == null ? null : Instant.parse(reviewedAt),
                ledgerId,
                idempotencyKey,
                Instant.parse(createdAt));
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

    public Long getTripId() {
        return tripId;
    }

    public void setTripId(Long tripId) {
        this.tripId = tripId;
    }

    public Long getApplicationId() {
        return applicationId;
    }

    public void setApplicationId(Long applicationId) {
        this.applicationId = applicationId;
    }

    public String getExitReason() {
        return exitReason;
    }

    public void setExitReason(String exitReason) {
        this.exitReason = exitReason;
    }

    public String getExitAt() {
        return exitAt;
    }

    public void setExitAt(String exitAt) {
        this.exitAt = exitAt;
    }

    public String getDepartureBasisAt() {
        return departureBasisAt;
    }

    public void setDepartureBasisAt(String departureBasisAt) {
        this.departureBasisAt = departureBasisAt;
    }

    public String getPenaltyTier() {
        return penaltyTier;
    }

    public void setPenaltyTier(String penaltyTier) {
        this.penaltyTier = penaltyTier;
    }

    public Integer getTheoreticalDelta() {
        return theoreticalDelta;
    }

    public void setTheoreticalDelta(Integer theoreticalDelta) {
        this.theoreticalDelta = theoreticalDelta;
    }

    public Integer getAppliedDelta() {
        return appliedDelta;
    }

    public void setAppliedDelta(Integer appliedDelta) {
        this.appliedDelta = appliedDelta;
    }

    public Integer getMonthlyOrdinal() {
        return monthlyOrdinal;
    }

    public void setMonthlyOrdinal(Integer monthlyOrdinal) {
        this.monthlyOrdinal = monthlyOrdinal;
    }

    public String getReviewStatus() {
        return reviewStatus;
    }

    public void setReviewStatus(String reviewStatus) {
        this.reviewStatus = reviewStatus;
    }

    public String getExitNote() {
        return exitNote;
    }

    public void setExitNote(String exitNote) {
        this.exitNote = exitNote;
    }

    public String getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(String reviewedAt) {
        this.reviewedAt = reviewedAt;
    }

    public Long getLedgerId() {
        return ledgerId;
    }

    public void setLedgerId(Long ledgerId) {
        this.ledgerId = ledgerId;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
}
