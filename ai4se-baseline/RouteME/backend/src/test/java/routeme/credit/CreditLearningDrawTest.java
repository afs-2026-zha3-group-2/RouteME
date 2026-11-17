package routeme.credit;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;

import org.junit.jupiter.api.Test;

import routeme.constant.CreditLearningConstant;

class CreditLearningDrawTest {

    private final LearningQuestionBank bank = new LearningQuestionBank();

    @Test
    void in_bankFile_out_twentyQuestionsFivePerCategory() {
        // When
        Set<Integer> answerIndexes = new HashSet<>();
        bank.all().forEach(question -> answerIndexes.add(question.answerIndex()));

        // Then
        assertAll(
                () -> assertEquals(20, bank.size(), "bank holds 20 questions"),
                () -> CreditLearningConstant.CATEGORIES.forEach(category -> assertEquals(
                        CreditLearningConstant.QUESTIONS_PER_CATEGORY,
                        bank.all().stream().filter(question -> question.category().equals(category)).count(),
                        "category " + category + " question count")),
                () -> assertTrue(answerIndexes.size() >= 3, "answers are spread across options"));
    }

    @Test
    void in_fixedSeed_out_tenQuestionsCoveringFourCategories() {
        // When
        List<String> drawn = bank.draw(new Random(20261117L));
        List<String> repeated = new LearningQuestionBank().draw(new Random(20261117L));

        // Then
        assertAll(
                () -> assertEquals(CreditLearningConstant.QUESTION_COUNT, drawn.size(), "ten questions"),
                () -> assertEquals(drawn.size(), Set.copyOf(drawn).size(), "no repeated question"),
                () -> assertEquals(drawn, repeated, "same seed draws the same set"),
                () -> CreditLearningConstant.CATEGORIES.forEach(category -> assertTrue(
                        drawn.stream().anyMatch(id -> bank.require(id).category().equals(category)),
                        "covers " + category)));
    }

    @Test
    void in_unknownId_out_illegalState() {
        assertAll(
                () -> assertThrows(IllegalStateException.class, () -> bank.require("Q99")),
                () -> assertEquals(
                        CreditLearningConstant.OPTION_COUNT, bank.require("Q01").options().size(), "four options"));
    }
}
