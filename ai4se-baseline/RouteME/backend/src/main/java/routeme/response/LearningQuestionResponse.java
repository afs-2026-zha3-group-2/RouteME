package routeme.response;

import java.util.List;

import routeme.credit.LearningQuestion;

/**
 * 一道题的下发视图：只含题面与选项，答案与判分依据永不下发。
 */
public record LearningQuestionResponse(String id, String category, String question, List<String> options) {

    public LearningQuestionResponse {
        options = List.copyOf(options);
    }

    public static LearningQuestionResponse from(LearningQuestion question) {
        return new LearningQuestionResponse(
                question.id(), question.category(), question.question(), question.options());
    }
}
