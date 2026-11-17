package routeme.response;

/**
 * 一次点赞 / 取消点赞后的最新状态：赞数由记录数派生，不单独存余额。
 */
public record ExperienceLikeResponse(long experienceId, int likeCount, boolean isLiked) {
}
