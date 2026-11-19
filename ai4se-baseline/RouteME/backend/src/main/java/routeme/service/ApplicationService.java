package routeme.service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import com.baomidou.mybatisplus.spring.service.IService;

import routeme.entity.TripApplicationEntity;
import routeme.pojo.ChatCounterpart;
import routeme.pojo.DemoUser;
import routeme.pojo.TripApplication;
import routeme.request.ApplicationCreateRequest;
import routeme.response.TripApplicationResponse;

/**
 * 同行申请：提交、取消、接受 / 拒绝、退出同行与当前同行者。
 */
public interface ApplicationService extends IService<TripApplicationEntity> {

    /**
     * 提交同行申请。
     *
     * @param tripId      被申请的行程 id
     * @param applicantId 申请人 id，不能是发布者
     * @param request     申请说明，选填且不超过 120 字
     * @return 新建的申请（状态 pending）
     */
    TripApplication apply(long tripId, long applicantId, ApplicationCreateRequest request);

    /**
     * 申请人取消自己待处理的申请。
     *
     * @param applicationId 申请 id
     * @param userId        当前身份 id，必须等于申请人
     * @return 取消后的申请（状态 cancelled）
     */
    TripApplication cancel(long applicationId, long userId);

    /**
     * 取某人在该行程上已接受的申请；没有则返回空。
     */
    Optional<TripApplication> findAccepted(long tripId, long userId);

    /**
     * 某人全部已接受的同行关系（跨行程）；用于信用限制自动解除。
     */
    List<TripApplication> acceptedByUser(long userId);

    /**
     * 把申请置为「已退出」（left），并记录状态原因；系统清退与用户退出共用。
     */
    void markLeft(long applicationId, String statusReason, Instant at);

    /**
     * 撤回某人的全部待处理申请；用于信用限制自动清退。
     */
    void cancelPendingByUser(long userId, String statusReason, Instant at);

    /**
     * 判断某个用户在该行程上是否已被接受为同行者。
     *
     * @param tripId 行程 id
     * @param userId 待判断的用户 id
     * @return 存在已接受申请时为 true
     */
    boolean isAccepted(long tripId, long userId);

    /**
     * 判断某个用户在该行程上是否曾加入后又退出（申请状态 left）。
     *
     * <p>用于群聊的只读判定：退出后仍可回看历史，但不能再发送。</p>
     *
     * @param tripId 行程 id
     * @param userId 待判断的用户 id
     * @return 存在 left 申请时为 true
     */
    boolean hasLeft(long tripId, long userId);

    /**
     * 判断某个用户在该行程上是否可参与一对一聊天：申请状态为已接受或已退出。
     *
     * <p>已退出（left）仍保留会话与读写能力，因此与 {@link #isAccepted} 区分。</p>
     *
     * @param tripId 行程 id
     * @param userId 待判断的用户 id
     * @return 存在 accepted 或 left 申请时为 true
     */
    boolean isChatPartner(long tripId, long userId);

    /**
     * 当前用户全部可沟通的聊天配对（accepted 或 left）：
     * 作为申请人时对方是发布者，作为发布者时对方是该行程的 accepted / left 申请人。
     *
     * @param userId 当前身份 id
     * @return 配对列表；不去重、不排序，由调用方合并
     */
    List<ChatCounterpart> chatCounterparts(long userId);

    /**
     * 我提交过的申请。
     *
     * @param userId 当前身份 id
     * @return 按创建时间倒序的申请列表
     */
    List<TripApplication> mine(long userId);

    /**
     * 发布者查看某行程的全部申请。
     *
     * @param tripId 行程 id
     * @param userId 当前身份 id，必须等于发布者
     * @return 按提交时间升序的申请列表
     */
    List<TripApplication> listForPublisher(long tripId, long userId);

    /**
     * 发布者接受一条待处理申请，行程人数 +1。
     *
     * @param applicationId 申请 id
     * @param publisherId   当前身份 id，必须等于该行程发布者
     * @return 处理后的申请（状态 accepted）
     */
    TripApplication accept(long applicationId, long publisherId);

    /**
     * 发布者拒绝一条待处理申请，人数不变。
     *
     * @param applicationId 申请 id
     * @param publisherId   当前身份 id，必须等于该行程发布者
     * @return 处理后的申请（状态 rejected）
     */
    TripApplication reject(long applicationId, long publisherId);

    /**
     * 按 id 取申请，不存在时抛 {@link routeme.exception.ApplicationNotFoundException}。
     *
     * @param applicationId 申请 id
     * @return 申请领域对象
     */
    TripApplication require(long applicationId);

    /**
     * 把申请组装成契约响应（含申请人、行程与发布者资料）。
     *
     * @param application 申请领域对象
     * @return 契约出参
     */
    TripApplicationResponse describe(TripApplication application);

    /**
     * 当前同行者：发布者在最前，其后按申请时间排列的已接受同行者。
     *
     * @param tripId 行程 id
     * @return 发布者 + 已接受同行者
     */
    List<DemoUser> participants(long tripId);

    /**
     * 行程进入已结束/已取消时，把该行程所有待处理申请批量置为已取消。
     *
     * @param tripId       行程 id
     * @param statusReason 状态原因：TRIP_COMPLETED / TRIP_CANCELLED / CREDIT_RESTRICTION
     * @param now          取消时间
     */
    void cancelPending(long tripId, String statusReason, Instant now);
}