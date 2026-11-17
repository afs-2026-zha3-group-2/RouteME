package routeme.service;

import java.util.List;

import routeme.response.LearningResultResponse;
import routeme.response.LearningSessionResponse;

/**
 * 安全学习恢复信用分：开始考试、完成学习、提交作答。
 * 方法契约以本接口为准；分数只经 {@link CreditService} 读写。
 */
public interface CreditLearningService {

    /**
     * 开始一次考试：读分判资格 → 判月度次数 → 抽 10 题 → 建会话（开始即计次）。
     */
    LearningSessionResponse start(long userId);

    /**
     * 完成本页学习：写入 {@code learning_completed_at}，重复调用不覆盖首次时间。
     */
    LearningSessionResponse completeLessons(long userId, long sessionId);

    /**
     * 提交作答并判分：未通过只落结果；通过则经记账服务恢复到 60，同月只恢复一次。
     */
    LearningResultResponse submit(long userId, long sessionId, List<Integer> answers);
}
