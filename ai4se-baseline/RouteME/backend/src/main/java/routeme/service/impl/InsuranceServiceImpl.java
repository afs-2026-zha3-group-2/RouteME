package routeme.service.impl;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import routeme.config.InsuranceProperties;
import routeme.entity.InsurancePolicyEntity;
import routeme.enums.InsuranceProductEnum;
import routeme.enums.TripStatusEnum;
import routeme.enums.WriteScopeEnum;
import routeme.exception.ForbiddenActionException;
import routeme.exception.TripNotOpenException;
import routeme.mapper.InsurancePolicyMapper;
import routeme.pojo.InsurancePolicy;
import routeme.pojo.TripPlan;
import routeme.response.InsuranceProductResponse;
import routeme.response.InsuranceProviderResponse;
import routeme.service.AccountStatusService;
import routeme.service.ApplicationService;
import routeme.service.InsuranceService;
import routeme.service.TripPlanService;

/**
 * 第三方旅行保险实现（design D4）：
 * 入口只做资格校验并返回第三方地址；确认回调才写入行程关联与保障期。
 * 不扣钱包、不产生流水、不保存投保敏感信息。
 */
@Service
public class InsuranceServiceImpl extends AbstractServiceImpl<InsurancePolicyMapper, InsurancePolicyEntity>
        implements InsuranceService {

    private final TripPlanService tripPlanService;
    private final ApplicationService applicationService;
    private final AccountStatusService accountStatusService;
    private final InsuranceProperties properties;
    private final Clock clock;

    public InsuranceServiceImpl(
            TripPlanService tripPlanService,
            ApplicationService applicationService,
            AccountStatusService accountStatusService,
            InsuranceProperties properties,
            Clock clock) {
        this.tripPlanService = tripPlanService;
        this.applicationService = applicationService;
        this.accountStatusService = accountStatusService;
        this.properties = properties;
        this.clock = clock;
    }

    @Override
    public List<InsurancePolicy> listByUser(long userId) {
        return list(Wrappers.<InsurancePolicyEntity>lambdaQuery()
                .eq(InsurancePolicyEntity::getUserId, userId)
                .orderByDesc(InsurancePolicyEntity::getConfirmedAt)
                .orderByDesc(InsurancePolicyEntity::getId))
                .stream()
                .map(InsuranceServiceImpl::toPolicy)
                .toList();
    }

    @Override
    public Optional<InsurancePolicy> find(long userId, long tripId) {
        InsurancePolicyEntity entity = getOne(Wrappers.<InsurancePolicyEntity>lambdaQuery()
                .eq(InsurancePolicyEntity::getUserId, userId)
                .eq(InsurancePolicyEntity::getTripId, tripId));
        return Optional.ofNullable(entity).map(InsuranceServiceImpl::toPolicy);
    }

    @Override
    public InsuranceProviderResponse provider() {
        return new InsuranceProviderResponse(
                properties.providerName(),
                properties.policyUrl(),
                properties.claimUrl(),
                properties.emergencyUrl());
    }

    @Override
    public List<InsuranceProductResponse> products() {
        return Arrays.stream(InsuranceProductEnum.values())
                .map(product -> new InsuranceProductResponse(
                        product.wireValue(), product.label(), product.summary()))
                .toList();
    }

    @Override
    public String purchaseUrl(long userId, long tripId) {
        requireTradable(userId, tripId);
        return withTrip(properties.purchaseUrl(), tripId);
    }

    @Override
    @Transactional
    public InsurancePolicy confirm(long userId, long tripId) {
        TripPlan trip = requireTradable(userId, tripId);
        Optional<InsurancePolicy> existing = find(userId, tripId);
        if (existing.isPresent()) {
            return existing.get();
        }
        InsurancePolicy policy = new InsurancePolicy(
                nextId(InsurancePolicyEntity::getId),
                userId,
                tripId,
                properties.providerName(),
                trip.startDate(),
                trip.endDate(),
                InsurancePolicy.STATUS_ACTIVE,
                clock.instant());
        try {
            save(toEntity(policy));
        } catch (DuplicateKeyException exception) {
            // 并发确认命中 (user_id, trip_id) 唯一索引：返回已写入的那条。
            return find(userId, tripId).orElseThrow(() -> exception);
        }
        return policy;
    }

    private TripPlan requireTradable(long userId, long tripId) {
        TripPlan trip = tripPlanService.requireCurrent(tripId);
        if (trip.publisherId() != userId && !applicationService.isAccepted(tripId, userId)) {
            throw new ForbiddenActionException("only participants can open insurance for trip " + tripId);
        }
        Instant now = clock.instant();
        TripStatusEnum status = trip.status(now);
        if (status != TripStatusEnum.RECRUITING
                && status != TripStatusEnum.FULL
                && status != TripStatusEnum.ONGOING) {
            throw new TripNotOpenException(tripId);
        }
        accountStatusService.assertCanWrite(userId, WriteScopeEnum.BUSINESS);
        return trip;
    }

    /** 只带行程 id 与目的地，不拼接用户身份或投保敏感信息。 */
    private static String withTrip(String baseUrl, long tripId) {
        return baseUrl + (baseUrl.contains("?") ? "&" : "?")
                + "trip_id=" + URLEncoder.encode(String.valueOf(tripId), StandardCharsets.UTF_8);
    }

    private static InsurancePolicyEntity toEntity(InsurancePolicy policy) {
        InsurancePolicyEntity entity = new InsurancePolicyEntity();
        entity.setId(policy.id());
        entity.setUserId(policy.userId());
        entity.setTripId(policy.tripId());
        entity.setProvider(policy.provider());
        entity.setCoverageStart(policy.coverageStart().toString());
        entity.setCoverageEnd(policy.coverageEnd().toString());
        entity.setStatus(policy.storedStatus());
        entity.setConfirmedAt(policy.confirmedAt().toString());
        return entity;
    }

    private static InsurancePolicy toPolicy(InsurancePolicyEntity entity) {
        return new InsurancePolicy(
                entity.getId(),
                entity.getUserId(),
                entity.getTripId(),
                entity.getProvider(),
                LocalDate.parse(entity.getCoverageStart()),
                LocalDate.parse(entity.getCoverageEnd()),
                entity.getStatus(),
                Instant.parse(entity.getConfirmedAt()));
    }
}