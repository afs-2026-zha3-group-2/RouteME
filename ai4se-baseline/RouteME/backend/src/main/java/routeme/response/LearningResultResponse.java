package routeme.response;

import java.util.List;

/**
 * 判分结果视图：得分、通过与恢复标记，以及恢复后的信用状态。
 *
 * <p>{@code recoveryApplied} 只在本次调用真正改写分数时为 true：重复提交或并发下
 * 已被他处恢复到 60 时返回既有结果而不重复播报。</p>
 */
public record LearningResultResponse(
        long sessionId,
        boolean passed,
        int score,
        int passLine,
        List<LearningAnswerDetailResponse> details,
        boolean recoveryApplied,
        int creditScore,
        String creditLevel) {

    public LearningResultResponse {
        details = List.copyOf(details);
    }
}
