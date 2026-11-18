package routeme.service;

import com.baomidou.mybatisplus.spring.service.IService;

import routeme.entity.NotificationEntity;
import routeme.enums.AccountStatusEnum;
import routeme.pojo.ChatMessage;
import routeme.response.NotificationCountsResponse;
import routeme.response.NotificationListResponse;

/**
 * 通知中心：写入（生产方在成功路径末尾调用）、最新 50 条与按类型计数、三种标读范围。
 *
 * <p>通知行与生产方同事务；失败隔离由实现内部捕获（不改变业务结果）。
 * 同一业务事件按收件人 + 去重键唯一，重复调用不会生成第二条。</p>
 */
public interface NotificationService extends IService<NotificationEntity> {

    /** 申请到达：通知行程发布者。 */
    void notifyApplicationReceived(long recipientId, long actorId, long tripId, long applicationId);

    /** 申请被接受：通知申请者。 */
    void notifyApplicationAccepted(long recipientId, long actorId, long tripId, long applicationId);

    /** 申请被拒绝：通知申请者。 */
    void notifyApplicationRejected(long recipientId, long actorId, long tripId, long applicationId);

    /** 行程取消导致申请关闭：通知仍待处理的申请者，正文带取消原因。 */
    void notifyApplicationClosed(
            long recipientId, long actorId, long tripId, long applicationId, String cancelReason);

    /** 行程满员：通知发布者与已接受同行者。 */
    void notifyTripFull(long recipientId, Long actorId, long tripId);

    /** 行程进入旅行中：通知发布者与已接受同行者。 */
    void notifyTripOngoing(long recipientId, long tripId);

    /** 行程取消：通知已接受同行者，正文带取消原因。 */
    void notifyTripCancelled(long recipientId, long actorId, long tripId, String cancelReason);

    /** 行程结束：通知发布者与已接受同行者。 */
    void notifyTripCompleted(long recipientId, long actorId, long tripId);

    /** 新聊天消息：通知接收方；自己发给自己时不写行。 */
    void notifyMessage(long recipientId, long actorId, ChatMessage message);

    /**
     * 信用分变化：正文展示变化分数、原因与变更后分数；低于 60 时高优先级。
     *
     * @param ledgerId 账本行 id，作为去重键；未落账本时可为 null
     */
    void notifyCreditChanged(
            long userId, int scoreBefore, int scoreAfter, Long ledgerId, String reasonCode);

    /** 举报已提交：通知举报人。 */
    void notifyReportSubmitted(long reporterId, long reportId);

    /** 举报进入处理中：通知举报人。 */
    void notifyReportProcessing(long reporterId, long reportId);

    /** 举报处理完成：通知举报人；不包含处理备注或他人的处罚细节。 */
    void notifyReportResolved(long reporterId, long reportId, boolean rejected);

    /**
     * 账号状态变化：说明限制内容与恢复时间（存在时），不包含管理员备注。
     *
     * @param banExpiresAt 封禁到期时刻 ISO 字符串；非封禁或永久封禁时为 null
     * @param occurredAt   本次状态写入时刻（去重键的一部分）
     */
    void notifyAccountStatus(
            long userId,
            AccountStatusEnum status,
            String banReasonCode,
            String banExpiresAt,
            String occurredAt);

    /** 客服接入（WAITING → HANDLING）：通知用户。 */
    void notifyServiceJoined(long userId, long sessionId);

    /** 客服新回复：通知用户。 */
    void notifyServiceReply(long userId, long sessionId, long messageId);

    /** 客服会话结束：通知用户。 */
    void notifyServiceClosed(long userId, long sessionId);

    /** 行程开始时的安全提醒（SYSTEM）。 */
    void notifySystemSafetyReminder(long recipientId, long tripId);

    /** 身份认证结果（SYSTEM）：同一用户只提示一次。 */
    void notifyIdentityVerified(long userId);

    /** 最新 50 条通知与按类型未读计数（同一时刻快照）。 */
    NotificationListResponse list(long recipientId);

    /**
     * 单条标读。
     *
     * @throws routeme.exception.NotificationNotFoundException id 不存在或不属于当前用户
     */
    NotificationCountsResponse markRead(long notificationId, long recipientId);

    /** 全部标读。 */
    NotificationCountsResponse markAllRead(long recipientId);

    /** 单会话标读：只清该会话的聊天类通知。 */
    NotificationCountsResponse markConversationRead(long recipientId, long tripId, long otherUserId);
}