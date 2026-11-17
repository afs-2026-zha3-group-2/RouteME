package routeme.response;

/**
 * 单题判分明细：只回答对错，不回传正确答案。
 */
public record LearningAnswerDetailResponse(String questionId, boolean correct) {
}
