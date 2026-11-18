package routeme.service;

import java.util.List;
import java.util.Optional;

import routeme.pojo.InsurancePolicy;
import routeme.response.InsuranceProductResponse;
import routeme.response.InsuranceProviderResponse;

/**
 * 第三方旅行保险的业务契约：RouteMe 只维护入口、行程关联与状态。
 *
 * <p>买入校验与借款一致：行程发布者或 {@code ACCEPTED} 同行者、行程可交易、
 * 账号为 {@code ACTIVE}；RouteMe 不计算保费、不扣钱包、不承保。</p>
 */
public interface InsuranceService {

    /**
     * 当前用户的全部保险记录，按确认时间倒序。
     */
    List<InsurancePolicy> listByUser(long userId);

    /**
     * 当前用户在某条行程下的保险记录。
     */
    Optional<InsurancePolicy> find(long userId, long tripId);

    /**
     * 实际保险服务提供方及其保单 / 理赔 / 紧急求助入口。
     */
    InsuranceProviderResponse provider();

    /**
     * 第三方提供的保障类别（无价格）。
     */
    List<InsuranceProductResponse> products();

    /**
     * 校验购买资格并生成第三方投保入口地址；不扣款、不写保单。
     */
    String purchaseUrl(long userId, long tripId);

    /**
     * 第三方确认投保后的结果回写；同一行程同一用户幂等。
     */
    InsurancePolicy confirm(long userId, long tripId);
}