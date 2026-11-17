package routeme.service;

import java.util.List;

import com.baomidou.mybatisplus.spring.service.IService;

import routeme.entity.ReportEntity;
import routeme.pojo.Report;
import routeme.request.ReportRequest;

/**
 * Report submission and the reporter's own read model.
 */
public interface ReportService extends IService<ReportEntity> {

    /**
     * Records a report submitted by {@code reporterId}.
     *
     * @param reporterId reporter account id
     * @param request    target, reason and optional note
     * @return stored report
     */
    Report submit(long reporterId, ReportRequest request);

    /**
     * Returns the reporter's own reports, newest first.
     *
     * @param reporterId reporter account id
     * @param limit      maximum rows, applied after ordering
     * @return reports owned by the caller
     */
    List<Report> listMine(long reporterId, int limit);

    /**
     * Counts the reporter's reports.
     *
     * @param reporterId reporter account id
     * @return total rows owned by the caller
     */
    long countMine(long reporterId);
}