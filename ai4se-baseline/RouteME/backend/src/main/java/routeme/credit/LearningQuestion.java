package routeme.credit;

import java.util.List;

/**
 * 一道安全学习题。{@code answerIndex} 只在服务端使用，任何响应都不下发。
 */
public record LearningQuestion(String id, String category, String question, List<String> options, int answerIndex) {

    public LearningQuestion {
        options = List.copyOf(options);
    }
}
