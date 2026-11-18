package routeme.service;

import routeme.response.AdminDashboardResponse;

/**
 * 管理后台概览：只读聚合，不缓存、不物化、不写库。
 */
public interface AdminDashboardService {

    /**
     * 即时计算六组计数与本次统计时刻。
     *
     * @return 数量、分布与 {@code generated_at}
     */
    AdminDashboardResponse overview();
}