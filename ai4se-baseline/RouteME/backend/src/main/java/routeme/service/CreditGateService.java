package routeme.service;

/**
 * 发布行程前的信用分门禁：唯一拦截面，只被 {@code TripController.create} 调用。
 */
public interface CreditGateService {

    /**
     * 断言当前用户可发布行程；低于 {@code CreditLearningConstant.PUBLISH_MIN_SCORE} 时抛 403。
     */
    void assertCanPublish(long userId);
}
