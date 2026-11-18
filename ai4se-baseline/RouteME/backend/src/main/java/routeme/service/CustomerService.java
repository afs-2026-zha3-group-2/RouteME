package routeme.service;

import java.util.List;
import java.util.Optional;

import routeme.pojo.PageResult;
import routeme.response.AdminUserReportRef;
import routeme.response.ServiceMessageResponse;
import routeme.response.ServiceSessionDetailResponse;
import routeme.response.ServiceSessionSummaryResponse;

/** 人工客服会话生命周期与消息。 */
public interface CustomerService {

    /**
     * 返回当前用户未结束的会话；没有时返回空。
     *
     * @param userId 用户 id
     * @return 会话详情（含消息）
     */
    Optional<ServiceSessionDetailResponse> current(long userId);

    /**
     * 创建或返回既有未结束会话（幂等）。
     *
     * @param userId 用户 id
     * @return 会话详情（含消息）
     */
    ServiceSessionDetailResponse createOrGet(long userId);

    /**
     * 读取本人会话的消息。
     *
     * @param sessionId 会话 id
     * @param userId    调用者 id
     * @return 升序消息；不存在或不属于调用者时为空
     */
    Optional<List<ServiceMessageResponse>> listMessages(long sessionId, long userId);

    /**
     * 用户发送消息。
     *
     * @param sessionId 会话 id
     * @param userId    调用者 id
     * @param content   1–500 字
     * @return 已保存消息；会话不存在或不属于调用者时为空
     */
    Optional<ServiceMessageResponse> sendUserMessage(long sessionId, long userId, String content);

    /**
     * 管理员发送消息。
     *
     * @param sessionId 会话 id
     * @param adminId   管理员 id
     * @param content   1–500 字
     * @return 已保存消息；会话不存在时为空
     */
    Optional<ServiceMessageResponse> sendAdminMessage(long sessionId, long adminId, String content);

    /**
     * 管理端会话队列。
     *
     * @param status 可选状态筛选
     * @param page   页码（从 1 起）
     * @param size   每页条数
     * @return 分页结果
     */
    PageResult<ServiceSessionSummaryResponse> adminList(String status, int page, int size);

    /**
     * 管理端会话详情：用户资料 + 相关举报 + 完整消息。
     *
     * @param sessionId 会话 id
     * @return 详情；不存在时为空
     */
    Optional<ServiceSessionDetailResponse> adminDetail(long sessionId);

    /**
     * 接入会话：{@code WAITING → HANDLING}。
     *
     * @param sessionId 会话 id
     * @param adminId   管理员 id
     * @return 详情；会话不存在时为空
     */
    Optional<ServiceSessionDetailResponse> join(long sessionId, long adminId);

    /**
     * 用户结束本人会话：{@code WAITING / HANDLING / RESOLVED → CLOSED}。
     *
     * @param sessionId 会话 id
     * @param userId    调用者 id
     * @return 详情；会话不存在或不属于调用者时为空
     */
    Optional<ServiceSessionDetailResponse> closeByUser(long sessionId, long userId);

    /**
     * 客服结束会话：{@code WAITING / HANDLING / RESOLVED → CLOSED}。
     *
     * @param sessionId 会话 id
     * @param adminId   管理员 id
     * @return 详情；会话不存在时为空
     */
    Optional<ServiceSessionDetailResponse> closeByAdmin(long sessionId, long adminId);

    /**
     * 客服标记处理完成：{@code HANDLING → RESOLVED}。
     *
     * @param sessionId 会话 id
     * @param adminId   管理员 id
     * @return 详情；会话不存在时为空
     */
    Optional<ServiceSessionDetailResponse> resolve(long sessionId, long adminId);

    /**
     * 用户相关举报（该用户是举报人或被举报人）。
     *
     * @param userId 用户 id
     * @return 最近 50 条举报引用
     */
    List<AdminUserReportRef> reportsForUser(long userId);
}