package routeme.pojo;

/**
 * 头像文件读取结果：只暴露图片字节与内容类型，不携带资料字段。
 */
public record AvatarFile(byte[] content, String contentType) {
}