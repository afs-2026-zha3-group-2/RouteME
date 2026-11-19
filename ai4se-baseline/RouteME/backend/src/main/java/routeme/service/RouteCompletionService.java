package routeme.service;

import routeme.pojo.RouteCompletion;

/**
 * 个人主页路线完成度的装配入口：样本口径（已结束行程数）由聚合服务负责，
 * 阈值派生单点仍是 {@link RouteCompletionPolicy}。
 */
public interface RouteCompletionService {

    /**
     * 计算某用户的路线完成度。
     *
     * @param userId 目标用户 id
     * @return 派生结果；无已结束行程样本时为 {@link RouteCompletion#INSUFFICIENT}
     */
    RouteCompletion evaluate(long userId);
}
