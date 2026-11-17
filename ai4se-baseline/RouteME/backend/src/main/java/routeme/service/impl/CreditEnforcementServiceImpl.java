package routeme.service.impl;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.springframework.context.event.EventListener;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import routeme.entity.CreditExitEventEntity;
import routeme.entity.CreditLedgerEntity;
import routeme.entity.CreditRestrictionEntity;
import routeme.enums.CreditExitMessageCode;
import routeme.enums.CreditExitPenaltyTier;
import routeme.enums.CreditExitReasonEnum;
import routeme.enums.CreditExitReviewStatus;
import routeme.enums.CreditRestrictionStatusEnum;
import routeme.enums.CreditRestrictionTypeEnum;
import routeme.enums.TripStatusEnum;
import routeme.exception.ForbiddenActionException;
import routeme.exception.InvalidInputException;
import routeme.exception.TripNotOpenException;
import routeme.mapper.CreditExitEventMapper;
import routeme.mapper.CreditLedgerMapper;
import routeme.mapper.CreditRestrictionMapper;
import routeme.model.CreditExitCalculator;
import routeme.pojo.CreditBooking;
import routeme.pojo.CreditExitEvent;
import routeme.pojo.CreditExitPreview;
import routeme.pojo.CreditExitResult;
import routeme.pojo.TripApplication;
import routeme.pojo.TripPlan;
import routeme.pojo.UserCredit;
import routeme.service.ApplicationService;
import routeme.service.CreditChangedEvent;
import routeme.service.CreditEnforcementService;
import routeme.service.CreditRestrictionGuard;
import routeme.service.CreditService;
import routeme.service.TripPlanService;

/**
 * 信用执行实现：退出预览 / 结算、待核实复核、限制触发与解除。
 *
 * <p>依赖方向：本类依赖 ApplicationService / TripPlanService；它们只依赖
 * {@link CreditRestrictionGuard}（叶子），因此不产生循环依赖。</p>
 */
@Service
public class CreditEnforcementServiceImpl
        extends AbstractServiceImpl<CreditExitEventMapper, CreditExitEventEntity>
        implements CreditEnforcementService {

    private static final String TRIGGER_REASON = "CREDIT_SCORE_BELOW_60";
    private static final String LIFT_REASON = "SCORE_RECOVERED_TO_60";
    private static final String STATUS_REASON_CREDIT = "CREDIT_RESTRICTION";

    private final CreditService creditService;
    private final CreditRestrictionGuard restrictionGuard;
    private final CreditLedgerMapper ledgerMapper;
    private final CreditRestrictionMapper restrictionMapper;
    private final ApplicationService applicationService;
    private final TripPlanService tripPlanService;
    private final Clock clock;

    public CreditEnforcementServiceImpl(
            CreditService creditService,
            CreditRestrictionGuard restrictionGuard,
            CreditLedgerMapper ledgerMapper,
            CreditRestrictionMapper restrictionMapper,
            ApplicationService applicationService,
            TripPlanService tripPlanService,
            Clock clock) {
        this.creditService = creditService;
        this.restrictionGuard = restrictionGuard;
        this.ledgerMapper = ledgerMapper;
        this.restrictionMapper = restrictionMapper;
        this.applicationService = applicationService;
        this.tripPlanService = tripPlanService;
        this.clock = clock;
    }

    @Override
    public CreditExitPreview previewExit(long tripId, long userId, CreditExitReasonEnum reason) {
        Instant now = clock.instant();
        TripPlan trip = requireLeavableTrip(tripId, userId, now);
        UserCredit credit = creditService.read(userId);
        int effectiveCount = countEffectivePreTripExits(userId, now, null);
        return CreditExitCalculator.preview(trip, reason, credit.score(), effectiveCount, now);
    }

    @Override
    @Transactional
    public CreditExitResult leave(long tripId, long userId, CreditExitReasonEnum reason) {
        Instant now = clock.instant();
        String idempotencyKey = "exit:" + userId + ":" + tripId;
        CreditExitEventEntity existing = findEventEntity(idempotencyKey, userId, tripId);
        if (existing != null) {
            return toResult(existing.toEvent(), creditService.read(userId));
        }
        TripPlan trip = requireLeavableTrip(tripId, userId, now);
        TripApplication accepted = applicationService.findAccepted(tripId, userId)
                .orElseThrow(() -> new ForbiddenActionException(
                        "only accepted companions can leave trip " + tripId));

        UserCredit before = creditService.read(userId);
        int effectiveCount = countEffectivePreTripExits(userId, now, null);
        CreditExitPreview preview = CreditExitCalculator.preview(
                trip, reason, before.score(), effectiveCount, now);
        tripPlanService.removeCompanion(tripId);
        applicationService.markLeft(accepted.id(), "USER_EXIT", now);

        UserCredit after = creditService.book(new CreditBooking(
                userId,
                reasonCode(reason, preview.penaltyTier()),
                preview.theoreticalDelta(),
                "TRIP",
                String.valueOf(tripId),
                idempotencyKey));
        Long ledgerId = findLedgerId(idempotencyKey);
        CreditExitEvent event = new CreditExitEvent(
                nextId(CreditExitEventEntity::getId),
                userId,
                tripId,
                reason,
                now,
                preview.departureAt(),
                preview.penaltyTier(),
                preview.theoreticalDelta(),
                after.score() - before.score(),
                preview.monthlyOrdinal(),
                preview.reviewStatus(),
                null,
                ledgerId,
                idempotencyKey,
                now);
        try {
            baseMapper.insert(CreditExitEventEntity.from(event));
        } catch (DuplicateKeyException exception) {
            event = findEvent(idempotencyKey, userId, tripId);
        }
        return toResult(event, after);
    }

    @Override
    @Transactional
    public CreditExitEvent reviewExit(long exitEventId, boolean upheld) {
        CreditExitEventEntity entity = getById(exitEventId);
        if (entity == null) {
            throw new InvalidInputException("exit event not found: " + exitEventId);
        }
        CreditExitEvent event = entity.toEvent();
        if (event.reviewStatus() == CreditExitReviewStatus.VERIFIED_TRUE
                || event.reviewStatus() == CreditExitReviewStatus.VERIFIED_FALSE) {
            return event;
        }
        if (event.reviewStatus() != CreditExitReviewStatus.PENDING) {
            throw new InvalidInputException("exit event is not pending review: " + exitEventId);
        }

        Instant now = clock.instant();
        if (upheld) {
            entity.setReviewStatus(CreditExitReviewStatus.VERIFIED_TRUE.wireValue());
            entity.setReviewedAt(now.toString());
            updateById(entity);
            return entity.toEvent();
        }

        int ordinal = 0;
        boolean doubled = false;
        int theoretical;
        if (event.penaltyTier().countsForMonthlyOrdinal()) {
            int effectiveCount = countEffectivePreTripExits(event.userId(), event.exitAt(), event.id());
            ordinal = effectiveCount + 1;
            doubled = ordinal >= 2;
            theoretical = event.penaltyTier().baseDelta() * (doubled ? 2 : 1);
        } else {
            theoretical = event.penaltyTier().baseDelta();
        }

        int applied = 0;
        Long ledgerId = event.ledgerId();
        if (theoretical != 0) {
            UserCredit before = creditService.read(event.userId());
            UserCredit after = creditService.book(new CreditBooking(
                    event.userId(),
                    "EXIT_REVIEW_PENALTY",
                    theoretical,
                    "TRIP",
                    String.valueOf(event.tripId()),
                    "exit-review:" + event.id()));
            applied = after.score() - before.score();
            ledgerId = findLedgerId("exit-review:" + event.id());
        }
        entity.setReviewStatus(CreditExitReviewStatus.VERIFIED_FALSE.wireValue());
        entity.setMonthlyOrdinal(ordinal);
        entity.setTheoreticalDelta(theoretical);
        entity.setAppliedDelta(applied);
        entity.setReviewedAt(now.toString());
        entity.setLedgerId(ledgerId);
        updateById(entity);
        return entity.toEvent();
    }

    @Override
    public boolean isRestricted(long userId) {
        return restrictionGuard.isRestricted(userId);
    }

    /**
     * 信用分变化监听：跨过 60 下沿触发限制，回到 60 上沿解除；同事务。
     */
    @EventListener
    @Transactional
    public void onCreditChanged(CreditChangedEvent event) {
        if (event.scoreBefore() >= CreditExitCalculator.RESTRICTION_THRESHOLD
                && event.scoreAfter() < CreditExitCalculator.RESTRICTION_THRESHOLD) {
            activateRestriction(event);
        } else if (event.scoreBefore() < CreditExitCalculator.RESTRICTION_THRESHOLD
                && event.scoreAfter() >= CreditExitCalculator.RESTRICTION_THRESHOLD) {
            liftRestriction(event.userId(), event.occurredAt());
        }
    }

    private TripPlan requireLeavableTrip(long tripId, long userId, Instant now) {
        TripPlan trip = tripPlanService.requireCurrent(tripId);
        if (trip.publisherId() == userId) {
            throw new ForbiddenActionException("publisher cannot leave own trip " + tripId);
        }
        restrictionGuard.requireNotRestricted(userId);
        TripStatusEnum status = trip.status(now);
        if (status == TripStatusEnum.COMPLETED || status == TripStatusEnum.CANCELLED) {
            throw new TripNotOpenException(tripId);
        }
        return trip;
    }

    private void activateRestriction(CreditChangedEvent event) {
        long userId = event.userId();
        if (restrictionGuard.activeRestriction(userId) != null) {
            return;
        }
        Instant now = event.occurredAt();
        CreditRestrictionEntity entity = new CreditRestrictionEntity();
        entity.setId(nextRestrictionId());
        entity.setUserId(userId);
        entity.setType(CreditRestrictionTypeEnum.AUTO_CREDIT.wireValue());
        entity.setTriggerReason(TRIGGER_REASON);
        entity.setTriggerScore(event.scoreAfter());
        entity.setTriggeredAt(now.toString());
        entity.setStatus(CreditRestrictionStatusEnum.ACTIVE.wireValue());
        entity.setActiveFlag(1);
        entity.setTriggerLedgerId(event.ledgerId());
        try {
            restrictionMapper.insert(entity);
        } catch (DuplicateKeyException exception) {
            return;
        }

        applicationService.cancelPendingByUser(userId, STATUS_REASON_CREDIT, now);
        for (TripApplication application : applicationService.acceptedByUser(userId)) {
            TripPlan trip = tripPlanService.require(application.tripId());
            TripStatusEnum status = trip.status(now);
            if (status == TripStatusEnum.COMPLETED || status == TripStatusEnum.CANCELLED) {
                continue;
            }
            tripPlanService.removeCompanion(application.tripId());
            applicationService.markLeft(application.id(), STATUS_REASON_CREDIT, now);
        }
        tripPlanService.cancelUnfinishedByPublisher(userId, now);
    }

    private void liftRestriction(long userId, Instant now) {
        CreditRestrictionEntity active = restrictionGuard.activeRestriction(userId);
        if (active == null) {
            return;
        }
        restrictionMapper.update(null, Wrappers.<CreditRestrictionEntity>lambdaUpdate()
                .eq(CreditRestrictionEntity::getId, active.getId())
                .set(CreditRestrictionEntity::getStatus, CreditRestrictionStatusEnum.LIFTED.wireValue())
                .set(CreditRestrictionEntity::getActiveFlag, null)
                .set(CreditRestrictionEntity::getLiftedAt, now.toString())
                .set(CreditRestrictionEntity::getLiftReason, LIFT_REASON));
    }

    private int countEffectivePreTripExits(long userId, Instant at, Long excludeEventId) {
        CreditExitCalculator.MonthWindow window = CreditExitCalculator.monthWindow(at);
        var query = Wrappers.<CreditExitEventEntity>lambdaQuery()
                .eq(CreditExitEventEntity::getUserId, userId)
                .ge(CreditExitEventEntity::getExitAt, window.start().toString())
                .lt(CreditExitEventEntity::getExitAt, window.end().toString())
                .in(CreditExitEventEntity::getPenaltyTier,
                        CreditExitPenaltyTier.D3TO7D.wireValue(),
                        CreditExitPenaltyTier.H24TO72.wireValue(),
                        CreditExitPenaltyTier.H12TO24.wireValue(),
                        CreditExitPenaltyTier.LT12H.wireValue())
                .in(CreditExitEventEntity::getReviewStatus,
                        CreditExitReviewStatus.NOT_REQUIRED.wireValue(),
                        CreditExitReviewStatus.VERIFIED_FALSE.wireValue());
        if (excludeEventId != null) {
            query.ne(CreditExitEventEntity::getId, excludeEventId);
        }
        return Math.toIntExact(baseMapper.selectCount(query));
    }

    private CreditExitEventEntity findEventEntity(String idempotencyKey, long userId, long tripId) {
        return baseMapper.selectOne(Wrappers.<CreditExitEventEntity>lambdaQuery()
                .eq(CreditExitEventEntity::getUserId, userId)
                .eq(CreditExitEventEntity::getTripId, tripId)
                .eq(CreditExitEventEntity::getIdempotencyKey, idempotencyKey)
                .last("LIMIT 1"));
    }

    private CreditExitEvent findEvent(String idempotencyKey, long userId, long tripId) {
        CreditExitEventEntity entity = findEventEntity(idempotencyKey, userId, tripId);
        if (entity == null) {
            throw new IllegalStateException("exit event missing for idempotency key " + idempotencyKey);
        }
        return entity.toEvent();
    }

    private Long findLedgerId(String idempotencyKey) {
        CreditLedgerEntity ledger = ledgerMapper.selectOne(Wrappers.<CreditLedgerEntity>lambdaQuery()
                .eq(CreditLedgerEntity::getIdempotencyKey, idempotencyKey)
                .last("LIMIT 1"));
        return ledger == null ? null : ledger.getId();
    }

    private long nextRestrictionId() {
        List<CreditRestrictionEntity> rows = restrictionMapper.selectList(
                Wrappers.<CreditRestrictionEntity>lambdaQuery()
                        .select(CreditRestrictionEntity::getId)
                        .orderByDesc(CreditRestrictionEntity::getId)
                        .last("LIMIT 1"));
        return rows.isEmpty() ? 1L : rows.getFirst().getId() + 1L;
    }

    private static String reasonCode(CreditExitReasonEnum reason, CreditExitPenaltyTier tier) {
        if (reason == CreditExitReasonEnum.SAFETY) {
            return "EXIT_SAFETY_PENDING";
        }
        if (reason == CreditExitReasonEnum.FORCE_MAJEURE) {
            return "EXIT_FORCE_MAJEURE_PENDING";
        }
        if (tier == CreditExitPenaltyTier.GE7D) {
            return "EXIT_BEFORE_TRIP_NO_PENALTY";
        }
        if (tier == CreditExitPenaltyTier.DURING) {
            return "EXIT_DURING_TRIP";
        }
        return "EXIT_BEFORE_TRIP";
    }

    private static CreditExitResult toResult(CreditExitEvent event, UserCredit credit) {
        return new CreditExitResult(
                credit.score(),
                credit.levelCode(),
                credit.score() < CreditExitCalculator.RESTRICTION_THRESHOLD,
                event.theoreticalDelta(),
                event.appliedDelta(),
                event.monthlyOrdinal(),
                event.reviewStatus(),
                messageCode(event));
    }

    private static CreditExitMessageCode messageCode(CreditExitEvent event) {
        if (event.reviewStatus() == CreditExitReviewStatus.PENDING) {
            return CreditExitMessageCode.PENDING_REVIEW;
        }
        if (event.penaltyTier() == CreditExitPenaltyTier.DURING) {
            return event.appliedDelta() == 0 ? CreditExitMessageCode.AT_FLOOR : CreditExitMessageCode.DURING_TRIP;
        }
        if (event.penaltyTier() == CreditExitPenaltyTier.GE7D) {
            return CreditExitMessageCode.NO_PENALTY;
        }
        if (event.appliedDelta() == 0 && event.theoreticalDelta() < 0) {
            return CreditExitMessageCode.AT_FLOOR;
        }
        if (event.monthlyOrdinal() >= 2) {
            return CreditExitMessageCode.PENALTY_DOUBLED;
        }
        return CreditExitMessageCode.PENALTY;
    }
}
