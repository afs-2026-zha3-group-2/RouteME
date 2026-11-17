package routeme.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

/**
 * credit_learning_session 行对象：一次考试一行，开始即计次。
 *
 * <p>题号与作答以 JSON 文本存储（两库共用一套迁移）；{@code passed} 存 0/1，
 * 提交前 {@code answers} / {@code score} / {@code passed} / {@code submittedAt} 均为 null。</p>
 */
@TableName("credit_learning_session")
public class CreditLearningSessionEntity {

    @TableId(type = IdType.INPUT)
    private Long id;

    private Long userId;

    private String monthKey;

    private String status;

    private String questionIds;

    private String answers;

    private Integer score;

    private Integer passed;

    private String startedAt;

    private String learningCompletedAt;

    private String submittedAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getMonthKey() {
        return monthKey;
    }

    public void setMonthKey(String monthKey) {
        this.monthKey = monthKey;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getQuestionIds() {
        return questionIds;
    }

    public void setQuestionIds(String questionIds) {
        this.questionIds = questionIds;
    }

    public String getAnswers() {
        return answers;
    }

    public void setAnswers(String answers) {
        this.answers = answers;
    }

    public Integer getScore() {
        return score;
    }

    public void setScore(Integer score) {
        this.score = score;
    }

    public Integer getPassed() {
        return passed;
    }

    public void setPassed(Integer passed) {
        this.passed = passed;
    }

    public String getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(String startedAt) {
        this.startedAt = startedAt;
    }

    public String getLearningCompletedAt() {
        return learningCompletedAt;
    }

    public void setLearningCompletedAt(String learningCompletedAt) {
        this.learningCompletedAt = learningCompletedAt;
    }

    public String getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(String submittedAt) {
        this.submittedAt = submittedAt;
    }
}
