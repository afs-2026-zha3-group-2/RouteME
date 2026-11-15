package routeme.service;

import com.baomidou.mybatisplus.spring.service.IService;

import routeme.entity.ReportEntity;
import routeme.pojo.Report;
import routeme.request.ReportRequest;

/**
 * 举报：记录原因与备注，不对外暴露处理流程。
 */
public interface ReportService extends IService<ReportEntity> {

    /**
     * 提交一条举报。
     *
     * @param reporterId 举报人（演示身份）id
     * @param request    举报对象类型、对象 id、原因与选填备注
     * @return 已落库的举报记录
     */
    Report submit(long reporterId, ReportRequest request);
}