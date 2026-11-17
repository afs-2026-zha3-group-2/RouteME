package routeme.service.impl;

import static routeme.constant.TripCatalogConstant.MAX_MEETING_AREA_LENGTH;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

import routeme.constant.TripTimeZoneConstant;
import routeme.enums.TripCancelReasonEnum;
import routeme.enums.TripStatusEnum;
import routeme.exception.ForbiddenActionException;
import routeme.exception.InvalidInputException;
import routeme.exception.TripNotFoundException;
import routeme.exception.TripNotOpenException;
import routeme.mapper.TripPlanMapper;
import routeme.param.PageParam;
import routeme.pojo.DemoUser;
import routeme.pojo.PageResult;
import routeme.pojo.TripMeetingRules;
import routeme.pojo.TripPlan;
import routeme.pojo.TripPlanDraft;
import routeme.entity.TripPlanEntity;
import routeme.request.TripCreateRequest;
import routeme.request.TripCancelRequest;
import routeme.request.TripMeetingRequest;
import routeme.request.TripQuery;
import routeme.service.AiItineraryService;
import routeme.service.DemoUserService;
import routeme.service.TripCancelledEvent;
import routeme.service.TripCompletedEvent;
import routeme.service.TripPlanService;

/**
 * 行程的业务实现：发布校验、分页查询、结束行程与同行人数联动。
 * 方法契约以 {@link routeme.service.TripPlanService} 为准。
 */
@Service
public class TripPlanServiceImpl extends AbstractServiceImpl<TripPlanMapper, TripPlanEntity>
        implements TripPlanService {

    private static final int MAX_CANCEL_NOTE_LENGTH = 100;

    private final DemoUserService demoUserService;
    private final AiItineraryService aiItineraryService;
    private final Clock clock;
    private final ApplicationEventPublisher events;

    public TripPlanServiceImpl(
            DemoUserService demoUserService,
            AiItineraryService aiItineraryService,
            Clock clock,
            ApplicationEventPublisher events) {
        this.demoUserService = demoUserService;
        this.aiItineraryService = aiItineraryService;
        this.clock = clock;
        this.events = events;
    }

    @Override
    @Transactional
    public TripPlan create(TripCreateRequest request, long publisherId) {
        Instant now = clock.instant();
        // AI 链接校验：快照必须存在且归属发布人，否则 INVALID_INPUT（B9 / B10）。
        if (request.aiItineraryId() != null) {
            aiItineraryService.requireOwnedSnapshot(request.aiItineraryId(), publisherId);
        }
        TripPlanDraft draft = new TripPlanDraft(
                publisherId,
                request.title(),
                request.destinationCode(),
                request.startDate(),
                request.endDate(),
                request.stops(),
                request.meetingAreas(),
                request.meetingTime(),
                request.note(),
                request.budgetMinCents(),
                request.budgetMaxCents(),
                request.tags(),
                request.capacity(),
                request.aiItineraryId());
        TripPlan validated = TripPlan.create(draft, now);
        TripPlan saved = validated.withId(nextId(TripPlanEntity::getId));
        save(TripPlanEntity.from(saved));
        return saved;
    }

    @Override
    @Transactional
    public PageResult<TripPlan> searchPage(TripQuery query, PageParam param) {
        materializeExpired();
        IPage<TripPlanEntity> page = baseMapper.selectOpenPage(
                new Page<>(param.page(), param.size()),
                query.destinationCode(),
                query.dateFrom() == null ? null : query.dateFrom().toString(),
                query.dateTo() == null ? null : query.dateTo().toString(),
                List.copyOf(query.tags()),
                sortKey(query),
                today());
        return new PageResult<>(
                page.getRecords().stream().map(TripPlanEntity::toTripPlan).toList(),
                param.page(),
                param.size(),
                page.getTotal());
    }

    @Override
    @Transactional
    public List<TripPlan> findOpen(TripQuery query) {
        materializeExpired();
        return baseMapper.selectOpenList(
                        query.destinationCode(),
                        query.dateFrom() == null ? null : query.dateFrom().toString(),
                        query.dateTo() == null ? null : query.dateTo().toString(),
                        List.copyOf(query.tags()),
                        sortKey(query),
                        today())
                .stream()
                .map(TripPlanEntity::toTripPlan)
                .toList();
    }

    @Override
    @Transactional
    public List<TripPlan> findAllTrips() {
        materializeExpired();
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
    @Transactional
    public TripPlan requireCurrent(long tripId) {
        return materializeIfExpired(tripId);
    }

    @Override
    @Transactional
    public TripPlan materializeIfExpired(long tripId) {
        TripPlan trip = require(tripId);
        Instant now = clock.instant();
        if (trip.cancelledAt() != null || trip.completedAt() != null || now.isBefore(trip.plannedEnd())) {
            return trip;
        }
        boolean updated = lambdaUpdate()
                .eq(TripPlanEntity::getId, tripId)
                .isNull(TripPlanEntity::getCompletedAt)
                .isNull(TripPlanEntity::getCancelledAt)
                .set(TripPlanEntity::getCompletedAt, trip.plannedEnd().toString())
                .set(TripPlanEntity::getUpdatedAt, now.toString())
                .update();
        if (updated) {
            events.publishEvent(new TripCompletedEvent(tripId, trip.plannedEnd()));
        }
        return require(tripId);
    }

    @Override
    @Transactional
    public void materializeExpired() {
        for (Long id : baseMapper.selectExpiredIds(today())) {
            materializeIfExpired(id);
        }
    }

    @Override
    @Transactional
    public Optional<TripPlan> latestOpenByPublisher(long publisherId) {
        materializeExpired();
        LambdaQueryWrapper<TripPlanEntity> query = Wrappers.<TripPlanEntity>lambdaQuery()
                .eq(TripPlanEntity::getPublisherId, publisherId)
                .isNull(TripPlanEntity::getCompletedAt)
                .isNull(TripPlanEntity::getCancelledAt)
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
    public TripPlan cancel(long tripId, long publisherId, TripCancelRequest request) {
        TripPlan trip = requireCurrent(tripId);
        if (trip.publisherId() != publisherId) {
            throw new ForbiddenActionException("only the publisher can cancel trip " + tripId);
        }
        Instant now = clock.instant();
        TripStatusEnum status = trip.status(now);
        if (status != TripStatusEnum.RECRUITING && status != TripStatusEnum.FULL) {
            throw new TripNotOpenException(tripId);
        }
        TripCancelReasonEnum reason = TripCancelReasonEnum.parse(request == null ? null : request.reason());
        String note = normalizeCancelNote(request == null ? null : request.note(), reason);
        boolean updated = lambdaUpdate()
                .eq(TripPlanEntity::getId, tripId)
                .isNull(TripPlanEntity::getCancelledAt)
                .isNull(TripPlanEntity::getCompletedAt)
                .set(TripPlanEntity::getCancelledAt, now.toString())
                .set(TripPlanEntity::getCancelReason, reason.wireValue())
                .set(TripPlanEntity::getCancelNote, note)
                .set(TripPlanEntity::getUpdatedAt, now.toString())
                .update();
        if (!updated) {
            throw new TripNotOpenException(tripId);
        }
        events.publishEvent(new TripCancelledEvent(tripId, now));
        return require(tripId);
    }

    @Override
    @Transactional
    public TripPlan complete(long tripId, long userId) {
        TripPlan trip = requireCurrent(tripId);
        if (trip.publisherId() != userId) {
            throw new ForbiddenActionException("only the publisher can complete trip " + tripId);
        }
        Instant now = clock.instant();
        if (trip.status(now) != TripStatusEnum.ONGOING) {
            throw new TripNotOpenException(tripId);
        }
        boolean updated = lambdaUpdate()
                .eq(TripPlanEntity::getId, tripId)
                .isNull(TripPlanEntity::getCompletedAt)
                .isNull(TripPlanEntity::getCancelledAt)
                .set(TripPlanEntity::getCompletedAt, now.toString())
                .set(TripPlanEntity::getUpdatedAt, now.toString())
                .update();
        if (updated) {
            events.publishEvent(new TripCompletedEvent(tripId, now));
        }
        return require(tripId);
    }

    @Override
    @Transactional
    public TripPlan addCompanion(long tripId) {
        TripPlan trip = requireCurrent(tripId);
        Instant now = clock.instant();
        if (trip.status(now) == TripStatusEnum.COMPLETED
                || trip.status(now) == TripStatusEnum.CANCELLED
                || trip.joinedCount() >= trip.capacity()) {
            throw new TripNotOpenException(tripId);
        }
        updateJoinedCount(tripId, trip.joinedCount() + 1);
        return require(tripId);
    }

    @Override
    @Transactional
    public TripPlan removeCompanion(long tripId) {
        TripPlan trip = requireCurrent(tripId);
        if (trip.status(clock.instant()) == TripStatusEnum.COMPLETED
                || trip.status(clock.instant()) == TripStatusEnum.CANCELLED) {
            throw new TripNotOpenException(tripId);
        }
        if (trip.joinedCount() <= 1) {
            throw new InvalidInputException("trip has no companion to remove: " + tripId);
        }
        updateJoinedCount(tripId, trip.joinedCount() - 1);
        return require(tripId);
    }

    @Override
    @Transactional
    public TripPlan updateMeeting(long tripId, long publisherId, TripMeetingRequest request) {
        TripPlan trip = require(tripId);
        if (trip.publisherId() != publisherId) {
            throw new ForbiddenActionException("only the publisher can edit meeting info of trip " + tripId);
        }
        if (trip.status(clock.instant()) == TripStatusEnum.COMPLETED
                || trip.status(clock.instant()) == TripStatusEnum.CANCELLED) {
            throw new TripNotOpenException(tripId);
        }
        List<String> meetingAreas = TripPlan.cleanMeetingAreas(request == null ? null : request.meetingAreas());
        String meetingTime = TripMeetingRules.normalize(request == null ? null : request.meetingTime());
        TripMeetingRules.requireWithinEndDate(trip.endDate(), meetingTime);
        TripPlan updated = trip.withMeetingInfo(meetingAreas, meetingTime, clock.instant());
        updateById(TripPlanEntity.from(updated));
        return updated;
    }

    private String normalizeCancelNote(String raw, TripCancelReasonEnum reason) {
        String note = raw == null ? null : raw.strip();
        if (note != null && note.isEmpty()) {
            note = null;
        }
        if (reason == TripCancelReasonEnum.OTHER && note == null) {
            throw new InvalidInputException("cancel note is required for other reason");
        }
        if (note != null && note.length() > MAX_CANCEL_NOTE_LENGTH) {
            throw new InvalidInputException("cancel note must be at most " + MAX_CANCEL_NOTE_LENGTH + " characters");
        }
        return note;
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

    private String today() {
        return LocalDate.ofInstant(clock.instant(), TripTimeZoneConstant.ZONE).toString();
    }
}