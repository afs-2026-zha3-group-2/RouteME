package routeme.service;

import com.baomidou.mybatisplus.spring.service.IService;

import routeme.entity.NotificationEntity;
import routeme.pojo.ChatMessage;
import routeme.response.NotificationCountsResponse;
import routeme.response.NotificationListResponse;

/**
 * 通知：写入（生产方在成功路径末尾调用）、最新 50 条与三项计数、三种标读范围。
 *
 * <p>通知行与生产方同事务；失败隔离由实现内部捕获（不改变业务结果）。</p>
 */
public interface NotificationService extends IService<NotificationEntity> {

    /**
     * 申请到达：通知行程发布者。
     *
     * @param recipientId   收件人（发布者）
     * @param actorId       动作人（申请者）
     * @param tripId        行程 id
     * @param applicationId 申请 id
     */
    void notifyApplicationReceived(long recipientId, long actorId, long tripId, long applicationId);

    /**
     * 申请被接受：通知申请者。
     *
     * @param recipientId   收件人（申请者）
     * @param actorId       动作人（发布者）
     * @param tripId        行程 id
     * @param applicationId 申请 id
     */
    void notifyApplicationAccepted(long recipientId, long actorId, long tripId, long applicationId);

    /**
     * 申请被拒绝：通知申请者。
     *
     * @param recipientId   收件人（申请者）
     * @param actorId       动作人（发布者）
     * @param tripId        行程 id
     * @param applicationId 申请 id
     */
    void notifyApplicationRejected(long recipientId, long actorId, long tripId, long applicationId);

    /**
     * 新消息：通知接收方；自己发给自己时不写行。
     *
     * @param recipientId 收件人
     * @param actorId     动作人（发送方）
     * @param message     已落库的消息（含正文与发送时间）
     */
    void notifyMessage(long recipientId, long actorId, ChatMessage message);

    /**
     * 最新 50 条通知与三项未读计数。
     *
     * @param recipientId 收件人
     * @return 列表与计数（同一时刻快照）
     */
    NotificationListResponse list(long recipientId);

    /**
     * 单条标读。
     *
     * @param notificationId 通知 id
     * @param recipientId    当前身份 id
     * @return 最新计数
     * @throws routeme.exception.NotificationNotFoundException id 不存在或不属于当前用户
     */
    NotificationCountsResponse markRead(long notificationId, long recipientId);

    /**
     * 全部标读。
     *
     * @param recipientId 当前身份 id
     * @return 最新计数
     */
    NotificationCountsResponse markAllRead(long recipientId);

    /**
     * 单会话标读：只清该会话的消息类通知。
     *
     * @param recipientId 当前身份 id
     * @param tripId      行程 id
     * @param otherUserId 对话另一方 id（消息发送方）
     * @return 最新计数
     */
    NotificationCountsResponse markConversationRead(long recipientId, long tripId, long otherUserId);
}