package routeme.pojo;

/**
 * 一条同行者推荐：候选用户、其关联行程与匹配结果。
 *
 * @param user  候选用户公开摘要
 * @param trip  关联行程
 * @param match 匹配总分、分项、原因与共同兴趣
 */
public record TravelerRecommendation(
        DemoUser user,
        TripPlan trip,
        TravelerMatch match) {
}