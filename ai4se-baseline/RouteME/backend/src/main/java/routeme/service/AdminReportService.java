package routeme.service;

import java.util.List;

import com.baomidou.mybatisplus.spring.service.IService;

import routeme.entity.ReportEntity;
import routeme.pojo.PageResult;
import routeme.pojo.Report;
import routeme.request.AdminReportResolveRequest;
import routeme.response.AdminReportDetailResponse;
import routeme.response.AdminReportSummaryResponse;

/** 管理端举报队列、详情与处理流程。 */
public interface AdminReportService extends IService<ReportEntity> {

    /**
     * 分页查询举报队列。
     *
     * @param status 可选状态筛选
     * @param page   页码（从 1 起）
     * @param size   每页条数
     * @return 按创建时间倒序的举报行
     */
    PageResult<AdminReportSummaryResponse> list(String status, int page, int size);

    /**
     * 举报详情。
     *
     * @param reportId 举报 id
     * @return 上下文与处置历史
     */
    AdminReportDetailResponse detail(long reportId);

    /**
     * 开始处理：{@code PENDING → PROCESSING}。
     *
     * @param reportId 举报 id
     * @param adminId  操作管理员
     * @return 更新后的详情
     */
    AdminReportDetailResponse start(long reportId, long adminId);

    /**
     * 处理举报：{@code PROCESSING → RESOLVED / REJECTED}，成立时在同一事务内处罚。
     *
     * @param reportId 举报 id
     * @param adminId  操作管理员
     * @param request  结果、备注与处罚动作
     * @return 更新后的详情
     */
    AdminReportDetailResponse resolve(long reportId, long adminId, AdminReportResolveRequest request);

    /** @return 全部举报，按创建时间倒序。 */
    List<Report> findAll();
}