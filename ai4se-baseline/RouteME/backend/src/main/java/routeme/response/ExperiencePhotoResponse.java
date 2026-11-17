package routeme.response;

/**
 * 游后体验图片引用：上传后先拿到 id 与只读地址，再随体验提交绑定。
 */
public record ExperiencePhotoResponse(long id, String url) {
}
