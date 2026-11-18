package routeme.pojo;

/**
 * 证明材料文件内容与 MIME：仅本人读取。
 */
public record LeaveEvidenceFile(byte[] content, String contentType) {
}
