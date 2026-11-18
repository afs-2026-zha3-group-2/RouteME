package routeme.response;

/**
 * 退出证明图片上传响应：只返回元数据；文件本身不对外提供读取入口。
 */
public record LeaveEvidenceResponse(
        long id,
        String originalName,
        String contentType,
        long sizeBytes) {
}
