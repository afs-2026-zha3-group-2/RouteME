package routeme.service;

import routeme.pojo.PageResult;
import routeme.request.AdminUserStatusRequest;
import routeme.response.AdminUserDetailResponse;
import routeme.response.AdminUserSummaryResponse;

/** 管理端用户列表、详情与状态迁移。 */
public interface AdminUserService {

    /**
     * 分页查询注册用户。
     *
     * @param q      可选关键字：用户 ID 精确、昵称包含、邮箱包含（忽略大小写）
     * @param status 可选有效状态筛选
     * @param page   页码（从 1 起）
     * @param size   每页条数
     * @return 按注册时间倒序的用户行
     */
    PageResult<AdminUserSummaryResponse> list(String q, String status, int page, int size);

    /**
     * 用户详情：资料 + 状态 + 三类关联内容（各取最近 50 条）。
     *
     * @param userId 目标用户 id
     * @return 用户详情
     */
    AdminUserDetailResponse detail(long userId);

    /**
     * 执行暂停 / 封禁 / 恢复。
     *
     * @param userId  目标用户 id
     * @param adminId 操作管理员 id
     * @param request 动作与处罚参数
     * @return 更新后的详情
     */
    AdminUserDetailResponse changeStatus(long userId, long adminId, AdminUserStatusRequest request);
}