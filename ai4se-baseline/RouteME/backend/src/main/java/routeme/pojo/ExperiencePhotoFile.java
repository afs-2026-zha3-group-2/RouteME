package routeme.pojo;

/**
 * 读取到的体验图片字节与内容类型。
 */
public record ExperiencePhotoFile(byte[] bytes, String mime) {
}
