package routeme.response;

/**
 * 公开资料的四项旅行统计；口径见 user-profiles 规格。
 */
public record ProfileStatsResponse(
        int published,
        int completed,
        int joined,
        int shared) {
}
