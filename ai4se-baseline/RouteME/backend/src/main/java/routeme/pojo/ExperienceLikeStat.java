package routeme.pojo;

/**
 * 一条体验的点赞统计（读时派生）：赞数来自记录数，{@code liked} 为当前查看者是否已赞。
 */
public record ExperienceLikeStat(long experienceId, int likeCount, boolean liked) {

    public static ExperienceLikeStat empty(long experienceId) {
        return new ExperienceLikeStat(experienceId, 0, false);
    }
}
