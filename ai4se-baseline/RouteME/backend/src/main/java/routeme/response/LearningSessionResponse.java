package routeme.response;

import java.util.List;

/**
 * 考试会话视图：题目、本月已用次数与本页学习是否完成。
 *
 * <p>{@code examUsed} 含本次（开始考试即计次），{@code examLimit} 为月度上限。</p>
 */
public record LearningSessionResponse(
        long sessionId,
        List<LearningQuestionResponse> questions,
        int examUsed,
        int examLimit,
        String month,
        boolean learningCompleted) {

    public LearningSessionResponse {
        questions = List.copyOf(questions);
    }
}
