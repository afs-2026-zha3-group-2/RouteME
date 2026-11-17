package routeme.entity;

import java.time.Instant;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import routeme.enums.ApplicationStatusEnum;
import routeme.pojo.TripApplication;

/**
 * trip_applications 行对象。
 */
@TableName("trip_applications")
public class TripApplicationEntity {

    @TableId(type = IdType.INPUT)
    private Long id;

    private Long tripId;

    private Long applicantId;

    private String message;

    private String status;

    /** 状态原因：USER_CANCEL / USER_EXIT / PUBLISHER_REJECT / TRIP_CANCELLED / TRIP_COMPLETED / CREDIT_RESTRICTION。 */
    private String statusReason;

    private String createdAt;

    private String decidedAt;

    public static TripApplicationEntity from(TripApplication application) {
        TripApplicationEntity entity = new TripApplicationEntity();
        entity.setId(application.id());
        entity.setTripId(application.tripId());
        entity.setApplicantId(application.applicantId());
        entity.setMessage(application.message());
        entity.setStatus(application.status().name());
        entity.setCreatedAt(application.createdAt().toString());
        entity.setDecidedAt(application.decidedAt() == null ? null : application.decidedAt().toString());
        return entity;
    }

    public TripApplication toApplication() {
        return new TripApplication(
                id,
                tripId,
                applicantId,
                message,
                ApplicationStatusEnum.valueOf(status),
                Instant.parse(createdAt),
                decidedAt == null ? null : Instant.parse(decidedAt));
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getTripId() {
        return tripId;
    }

    public void setTripId(Long tripId) {
        this.tripId = tripId;
    }

    public Long getApplicantId() {
        return applicantId;
    }

    public void setApplicantId(Long applicantId) {
        this.applicantId = applicantId;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getStatusReason() {
        return statusReason;
    }

    public void setStatusReason(String statusReason) {
        this.statusReason = statusReason;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getDecidedAt() {
        return decidedAt;
    }

    public void setDecidedAt(String decidedAt) {
        this.decidedAt = decidedAt;
    }
}