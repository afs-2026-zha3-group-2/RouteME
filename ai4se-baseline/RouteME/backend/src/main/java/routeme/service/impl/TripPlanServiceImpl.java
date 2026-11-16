package routeme.service.impl;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

import routeme.enums.TripStatusEnum;
import routeme.exception.ForbiddenActionException;
import routeme.exception.InvalidInputException;
import routeme.exception.TripNotFoundException;
import routeme.exception.TripNotOpenException;
import routeme.mapper.TripPlanMapper;
import routeme.param.PageParam;
import routeme.pojo.DemoUser;
import routeme.pojo.PageResult;
import routeme.pojo.TripPlan;
import routeme.pojo.TripPlanDraft;
import routeme.entity.TripPlanEntity;
import routeme.request.TripCreateRequest;
import routeme.request.TripQuery;
import routeme.service.DemoUserService;
import routeme.service.TripPlanService;

/**
 * 行程的业务实现：发布校验、分页查询、结束行程与同行人数联动。
 * 方法契约以 {@link routeme.service.TripPlanService} 为准。
 */
@Service
public class TripPlanServiceImpl extends AbstractServiceImpl<TripPlanMapper, TripPlanEntity>
        implements TripPlanService {

    private final DemoUserService demoUserService;
    private final Clock clock;

    public TripPlanServiceImpl(DemoUserService demoUserService, Clock clock) {
        this.demoUserService = demoUserService;
        this.clock = clock;
    }

    @Override
    @Transactional
    public TripPlan create(TripCreateRequest request, long publisherId) {
        Instant now = clock.instant();
        TripPlanDraft draft = new TripPlanDraft(
                publisherId,
                request.title(),
                request.destinationCode(),
                request.startDate(),
                request.endDate(),
                request.stops(),
                request.meetingArea(),
                request.note(),
                request.budgetMinCents(),
                request.budgetMaxCents(),
                request.tags(),
                request.capacity());
        TripPlan validated = TripPlan.create(draft, now);
        TripPlan saved = validated.withId(nextId(TripPlanEntity::getId));
        save(TripPlanEntity.from(saved));
        return saved;
    }

    @Override
    public PageResult<TripPlan> searchPage(TripQuery query, PageParam param) {
        IPage<TripPlanEntity> page = baseMapper.selectOpenPage(
                new Page<>(param.page(), param.size()),
                query.destinationCode(),
                query.dateFrom() == null ? null : query.dateFrom().toString(),
                query.dateTo() == null ? null : query.dateTo().toString(),
                List.copyOf(query.tags()),
                sortKey(query));
        return new PageResult<>(
                page.getRecords().stream().map(TripPlanEntity::toTripPlan).toList(),
                param.page(),
                param.size(),
                page.getTotal());
    }

    @Override
    public List<TripPlan> findOpen(TripQuery query) {
        return baseMapper.selectOpenList(
                        query.destinationCode(),
                        query.dateFrom() == null ? null : query.dateFrom().toString(),
                        query.dateTo() == null ? null : query.dateTo().toString(),
                        List.copyOf(query.tags()),
                        sortKey(query))
                .stream()
                .map(TripPlanEntity::toTripPlan)
                .toList();
    }

    @Override
    public List<TripPlan> findAllTrips() {
        return list(Wrappers.<TripPlanEntity>lambdaQuery()
                .orderByDesc(TripPlanEntity::getCreatedAt)
                .orderByDesc(TripPlanEntity::getId)).stream()
                .map(TripPlanEntity::toTripPlan)
                .toList();
    }

    @Override
    public TripPlan require(long tripId) {
        TripPlanEntity entity = getById(tripId);
        if (entity == null) {
            throw new TripNotFoundException(tripId);
        }
        return entity.toTripPlan();
    }

    @Override
    public Optional<TripPlan> latestOpenByPublisher(long publisherId) {
        LambdaQueryWrapper<TripPlanEntity> query = Wrappers.<TripPlanEntity>lambdaQuery()
                .eq(TripPlanEntity::getPublisherId, publisherId)
                .isNull(TripPlanEntity::getCompletedAt)
                .orderByDesc(TripPlanEntity::getCreatedAt)
                .orderByDesc(TripPlanEntity::getId);
        return page(new Page<TripPlanEntity>(1, 1, false), query).getRecords().stream()
                .findFirst()
                .map(TripPlanEntity::toTripPlan);
    }

    @Override
    public DemoUser publisherOf(TripPlan trip) {
        return demoUserService.require(trip.publisherId());
    }

    @Override
    @Transactional
    public TripPlan complete(long tripId, long userId) {
        TripPlan trip = require(tripId);
        if (trip.publisherId() != userId) {
            throw new ForbiddenActionException("only the publisher can complete trip " + tripId);
        }
        if (trip.status() == TripStatusEnum.COMPLETED) {
            throw new TripNotOpenException(tripId);
        }
        Instant now = clock.instant();
        lambdaUpdate()
                .eq(TripPlanEntity::getId, tripId)
                .set(TripPlanEntity::getCompletedAt, now.toString())
                .set(TripPlanEntity::getUpdatedAt, now.toString())
                .update();
        return require(tripId);
    }

    @Override
    @Transactional
    public TripPlan addCompanion(long tripId) {
        TripPlan trip = require(tripId);
        if (trip.status() != TripStatusEnum.RECRUITING) {
            throw new TripNotOpenException(tripId);
        }
        updateJoinedCount(tripId, trip.joinedCount() + 1);
        return require(tripId);
    }

    @Override
    @Transactional
    public TripPlan removeCompanion(long tripId) {
        TripPlan trip = require(tripId);
        if (trip.status() == TripStatusEnum.COMPLETED) {
            throw new TripNotOpenException(tripId);
        }
        if (trip.joinedCount() <= 1) {
            throw new InvalidInputException("trip has no companion to remove: " + tripId);
        }
        updateJoinedCount(tripId, trip.joinedCount() - 1);
        return require(tripId);
    }

    private void updateJoinedCount(long tripId, int joinedCount) {
        lambdaUpdate()
                .eq(TripPlanEntity::getId, tripId)
                .set(TripPlanEntity::getJoinedCount, joinedCount)
                .set(TripPlanEntity::getUpdatedAt, clock.instant().toString())
                .update();
    }

    private String sortKey(TripQuery query) {
        return query.sort() == TripQuery.SortOrder.NEW ? "new" : "date";
    }
}