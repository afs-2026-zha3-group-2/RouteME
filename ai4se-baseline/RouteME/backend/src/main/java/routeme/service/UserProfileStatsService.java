package routeme.service;

import routeme.response.ProfileStatsResponse;

/**
 * 公开资料的四项旅行统计；只读聚合，不拥有任何表。
 */
public interface UserProfileStatsService {

    ProfileStatsResponse stats(long userId);
}
