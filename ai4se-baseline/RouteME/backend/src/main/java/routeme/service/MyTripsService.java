package routeme.service;

import routeme.response.MyTripsResponse;

/**
 * 我的旅行：跨「我发布的 / 我申请的 / 已匹配 / 已完成」聚合，不拥有数据表。
 */
public interface MyTripsService {

    /**
     * 汇总某个身份的四组行程与待处理申请数。
     *
     * @param userId 当前身份 id
     * @return 我的旅行聚合响应
     */
    MyTripsResponse forUser(long userId);
}