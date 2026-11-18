package routeme.request;

import java.util.List;

/**
 * 退出同行请求：原因必选（personal / force_majeure / safety）；
 * note 为退出说明（≤200 字，安全原因 / 不可抗力必填）；
 * attachmentIds 为已上传的证明图片（≤3）。
 */
public record LeaveRequest(String reason, String note, List<Long> attachmentIds) {
}
