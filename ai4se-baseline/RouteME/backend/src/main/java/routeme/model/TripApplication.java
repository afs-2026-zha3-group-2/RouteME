package routeme.model;

import java.time.Instant;

/**
 * 同行申请。已接受申请即同行关系；状态流转由领域方法保持不可变。
 */
public record TripApplication(
        long id,
        long tripId,
        long applicantId,
        String message,
        ApplicationStatus status,
        Instant createdAt,
        Instant decidedAt) {

    public boolean isPending() {
        return status == ApplicationStatus.PENDING;
    }

    public boolean isAccepted() {
        return status == ApplicationStatus.ACCEPTED;
    }

    public TripApplication withStatus(ApplicationStatus next, Instant at) {
        return new TripApplication(id, tripId, applicantId, message, next, createdAt, at);
    }

    public TripApplication withId(long newId) {
        return new TripApplication(newId, tripId, applicantId, message, status, createdAt, decidedAt);
    }
}