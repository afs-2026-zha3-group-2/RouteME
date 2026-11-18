package routeme.response;

/**
 * 点赞结果：{@code created} 区分首次 201 与重复点赞 200。
 */
public record ExperienceLikeSaveResponse(ExperienceLikeResponse like, boolean created) {
}
