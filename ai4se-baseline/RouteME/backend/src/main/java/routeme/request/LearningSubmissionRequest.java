package routeme.request;

import java.util.List;

/**
 * 提交作答请求。字段与契约 LearningSubmissionRequest 一一对应。
 *
 * <p>只带作答列表：长度必须等于本次会话题数（10），每项为 0–3 的选项下标。
 * 请求体里即使出现用户标识也不会被读取——身份只取 {@code X-User-Id}。</p>
 */
public record LearningSubmissionRequest(List<Integer> answers) {
}
