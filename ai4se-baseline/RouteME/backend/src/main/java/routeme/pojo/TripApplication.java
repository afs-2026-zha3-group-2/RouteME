package routeme.pojo;

import java.time.Instant;

import routeme.enums.ApplicationStatusEnum;

/**
 * 同行申请。已接受申请即同行关系，已退出申请保留历史与聊天；状态流转由领域方法保持不可变。
 */
public record TripApplication(
        long id,
        long tripId,
        long applicantId,
        String message,
        ApplicationStatusEnum status,
        Instant createdAt,
        Instant decidedAt) {

    public boolean isPending() {
        return status == ApplicationStatusEnum.PENDING;
    }

    public boolean isAccepted() {
        return status == ApplicationStatusEnum.ACCEPTED;
    }

    /**
     * 是否曾接受后退出。LEFT 不删除历史，聊天准入与左栏会话仍有效。
     */
    public boolean isLeft() {
        return status == ApplicationStatusEnum.LEFT;
    }

    public TripApplication withStatus(ApplicationStatusEnum next, Instant at) {
        return new TripApplication(id, tripId, applicantId, message, next, createdAt, at);
    }

    public TripApplication withId(long newId) {
        return new TripApplication(newId, tripId, applicantId, message, status, createdAt, decidedAt);
    }
}