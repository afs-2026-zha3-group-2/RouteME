package routeme.credit;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import routeme.constant.CreditLearningConstant;

/**
 * 安全学习题库：启动期从 {@code credit/learning-questions.json} 加载 20 题并自校验。
 *
 * <p>校验不通过直接启动失败：题库是服务端唯一判分依据，缺题或越界会让判分静默出错。
 * 数据由 {@link LearningQuestion} 表达，题面与答案都不进契约。</p>
 */
@Component
public class LearningQuestionBank {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String RESOURCE = "credit/learning-questions.json";

    private final List<LearningQuestion> questions;
    private final Map<String, LearningQuestion> byId;

    public LearningQuestionBank() {
        List<LearningQuestion> loaded = load();
        validate(loaded);
        this.questions = List.copyOf(loaded);
        Map<String, LearningQuestion> index = new LinkedHashMap<>();
        for (LearningQuestion question : loaded) {
            index.put(question.id(), question);
        }
        this.byId = Map.copyOf(index);
    }

    public int size() {
        return questions.size();
    }

    public List<LearningQuestion> all() {
        return questions;
    }

    public LearningQuestion require(String id) {
        LearningQuestion question = byId.get(id);
        if (question == null) {
            throw new IllegalStateException("unknown learning question: " + id);
        }
        return question;
    }

    /**
     * 抽题：四类各 1 题保底覆盖，再从剩余题目随机补足到 10 题。
     *
     * @return 题号列表，顺序即作答顺序
     */
    public List<String> draw(Random random) {
        List<LearningQuestion> picked = new ArrayList<>(CreditLearningConstant.QUESTION_COUNT);
        List<LearningQuestion> remaining = new ArrayList<>(questions);
        for (String category : CreditLearningConstant.CATEGORIES) {
            List<LearningQuestion> pool = remaining.stream()
                    .filter(question -> question.category().equals(category))
                    .toList();
            LearningQuestion question = pool.get(random.nextInt(pool.size()));
            picked.add(question);
            remaining.remove(question);
        }
        while (picked.size() < CreditLearningConstant.QUESTION_COUNT) {
            picked.add(remaining.remove(random.nextInt(remaining.size())));
        }
        return picked.stream().map(LearningQuestion::id).toList();
    }

    private List<LearningQuestion> load() {
        ClassPathResource resource = new ClassPathResource(RESOURCE);
        try (InputStream input = resource.getInputStream()) {
            return MAPPER.readValue(input, new TypeReference<List<LearningQuestion>>() {
            });
        } catch (IOException error) {
            throw new IllegalStateException("failed to load " + RESOURCE, error);
        }
    }

    private void validate(List<LearningQuestion> loaded) {
        if (loaded.size() != CreditLearningConstant.BANK_SIZE) {
            throw new IllegalStateException(
                    "learning question bank must hold " + CreditLearningConstant.BANK_SIZE + " questions, got "
                            + loaded.size());
        }
        Map<String, Integer> perCategory = new LinkedHashMap<>();
        Set<String> seen = new HashSet<>();
        for (LearningQuestion question : loaded) {
            if (question.id() == null || question.id().isBlank()) {
                throw new IllegalStateException("learning question id is required");
            }
            if (!seen.add(question.id())) {
                throw new IllegalStateException("duplicate learning question id: " + question.id());
            }
            if (!CreditLearningConstant.CATEGORIES.contains(question.category())) {
                throw new IllegalStateException("unknown learning question category: " + question.category());
            }
            if (question.question() == null || question.question().isBlank()) {
                throw new IllegalStateException("learning question text is required: " + question.id());
            }
            if (question.options().size() != CreditLearningConstant.OPTION_COUNT) {
                throw new IllegalStateException(
                        "learning question must offer " + CreditLearningConstant.OPTION_COUNT + " options: "
                                + question.id());
            }
            if (question.answerIndex() < 0 || question.answerIndex() >= CreditLearningConstant.OPTION_COUNT) {
                throw new IllegalStateException("answer index out of range: " + question.id());
            }
            perCategory.merge(question.category(), 1, Integer::sum);
        }
        for (String category : CreditLearningConstant.CATEGORIES) {
            int count = perCategory.getOrDefault(category, 0);
            if (count != CreditLearningConstant.QUESTIONS_PER_CATEGORY) {
                throw new IllegalStateException(
                        "category " + category + " must hold " + CreditLearningConstant.QUESTIONS_PER_CATEGORY
                                + " questions, got " + count);
            }
        }
    }
}
