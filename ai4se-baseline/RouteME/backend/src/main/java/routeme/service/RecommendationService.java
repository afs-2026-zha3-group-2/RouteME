package routeme.service;

import routeme.pojo.RecommendationResult;

/**
 * 同行者推荐：以当前行程为参照，筛选、评分、去重并排序其他旅行者。
 */
public interface RecommendationService {

    /**
     * 计算某条行程的同行者推荐。
     *
     * @param tripId 参照行程 id
     * @param userId 当前用户 id
     * @return 参照说明与已排序的推荐项；没有候选时 {@code items} 为空
     */
    RecommendationResult recommend(long tripId, long userId);
}