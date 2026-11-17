package routeme.service;

/**
 * 体验获赞的信用结算：只在新点赞成功时同事务触发，按档位逐级发放。
 */
public interface ExperienceLikeRewardService {

    /**
     * 按当前赞数重新核对档位并补发尚未结算的档位。
     *
     * @param tripId   体验所属行程 id
     * @param authorId 获赞体验的作者 id
     */
    void award(long tripId, long authorId);
}
