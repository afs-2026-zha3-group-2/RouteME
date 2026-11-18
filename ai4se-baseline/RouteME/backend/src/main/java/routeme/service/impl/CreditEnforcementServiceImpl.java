package routeme.service.impl;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;

import org.springframework.context.event.EventListener;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import routeme.entity.CreditExitAttachmentEntity;
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
import routeme.exception.LeaveRecordNotFoundException;
import routeme.exception.TripNotOpenException;
import routeme.mapper.CreditExitAttachmentMapper;
import routeme.mapper.CreditExitEventMapper;
import routeme.mapper.CreditLedgerMapper;
import routeme.mapper.CreditRestrictionMapper;
import routeme.model.CreditExitCalculator;
import routeme.pojo.CreditBooking;
import routeme.pojo.CreditExitEvent;
import routeme.pojo.CreditExitPreview;
import routeme.pojo.CreditExitResult;
import routeme.pojo.LeaveEvidenceFile;
import routeme.pojo.TripApplication;
import routeme.pojo.TripPlan;
import routeme.pojo.UserCredit;
import routeme.response.LeaveEvidenceResponse;
import routeme.response.LeaveRecordResponse;
import routeme.service.ApplicationService;
import routeme.service.CreditChangedEvent;
import routeme.service.CreditEnforcementService;
import routeme.service.CreditRestrictionGuard;
import routeme.service.CreditService;
import routeme.service.TripPlanService;
import routeme.utils.ExitEvidenceStorage;
import routeme.utils.PhotoMagic;
import routeme.utils.PhotoMetadataStripper;

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
    private static final int MAX_NOTE_LENGTH = 200;
    private static final int MAX_ATTACHMENTS = 3;
    private static final Duration ATTACHMENT_TTL = Duration.ofHours(24);

    private final CreditService creditService;
    private final CreditRestrictionGuard restrictionGuard;
    private final CreditLedgerMapper ledgerMapper;
    private final CreditRestrictionMapper restrictionMapper;
    private final CreditExitAttachmentMapper attachmentMapper;
    private final ExitEvidenceStorage evidenceStorage;
    private final ApplicationService applicationService;
    private final TripPlanService tripPlanService;
    private final Clock clock;

    public CreditEnforcementServiceImpl(
            CreditService creditService,
            CreditRestrictionGuard restrictionGuard,
            CreditLedgerMapper ledgerMapper,
            CreditRestrictionMapper restrictionMapper,
            CreditExitAttachmentMapper attachmentMapper,
            ExitEvidenceStorage evidenceStorage,
            ApplicationService applicationService,
            TripPlanService tripPlanService,
            Clock clock) {
        this.creditService = creditService;
        this.restrictionGuard = restrictionGuard;
        this.ledgerMapper = ledgerMapper;
        this.restrictionMapper = restrictionMapper;
        this.attachmentMapper = attachmentMapper;
        this.evidenceStorage = evidenceStorage;
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
    public LeaveEvidenceResponse uploadEvidence(long tripId, long userId, MultipartFile file) {
        Instant now = clock.instant();
        requireLeavableTrip(tripId, userId, now);
        requireAcceptedCompanion(tripId, userId);
        byte[] content = readBytes(file);
        if (content.length == 0) {
            throw new InvalidInputException("exit evidence is required");
        }
        if (content.length > PhotoMagic.MAX_BYTES) {
            throw new InvalidInputException("exit evidence must be at most 5 MB");
        }
        PhotoMagic.Format format = PhotoMagic.detect(content);
        if (format == null) {
            throw new InvalidInputException("exit evidence must be jpeg, png or webp");
        }
        cleanupStaleAttachments(userId, tripId, now);
        long pending = attachmentMapper.selectCount(Wrappers.<CreditExitAttachmentEntity>lambdaQuery()
                .eq(CreditExitAttachmentEntity::getUserId, userId)
                .eq(CreditExitAttachmentEntity::getTripId, tripId)
                .isNull(CreditExitAttachmentEntity::getExitEventId));
        if (pending >= MAX_ATTACHMENTS) {
            throw new InvalidInputException("at most 3 exit evidence photos");
        }
        byte[] stripped = PhotoMetadataStripper.strip(content, format);
        String fileName = evidenceStorage.store(userId, tripId, format, stripped);
        CreditExitAttachmentEntity entity = new CreditExitAttachmentEntity();
        entity.setId(nextAttachmentId());
        entity.setUserId(userId);
        entity.setTripId(tripId);
        entity.setFileName(fileName);
        entity.setOriginalName(originalName(file));
        entity.setContentType(format.mime());
        entity.setSizeBytes((long) stripped.length);
        entity.setCreatedAt(now.toString());
        try {
            attachmentMapper.insert(entity);
        } catch (RuntimeException exception) {
            evidenceStorage.deleteQuietly(fileName);
            throw exception;
        }
        return new LeaveEvidenceResponse(
                entity.getId(), entity.getOriginalName(), entity.getContentType(), entity.getSizeBytes());
    }

    @Override
    @Transactional
    public CreditExitResult leave(
            long tripId,
            long userId,
            CreditExitReasonEnum reason,
            String note,
            List<Long> attachmentIds) {
        Instant now = clock.instant();
        TripApplication accepted = applicationService.findAccepted(tripId, userId).orElse(null);
        String idempotencyKey;
        if (accepted == null) {
            CreditExitEventEntity last = findLatestEventEntity(userId, tripId);
            if (last != null) {
                return toResult(last.toEvent(), creditService.read(userId));
            }
            throw new ForbiddenActionException("only accepted companions can leave trip " + tripId);
        }
        idempotencyKey = "exit:" + userId + ":" + tripId + ":" + accepted.id();
        CreditExitEventEntity existing = findEventEntity(idempotencyKey, userId, tripId);
        if (existing != null) {
            return toResult(existing.toEvent(), creditService.read(userId));
        }
        String cleanNote = normalizeNote(reason, note);
        List<Long> ids = normalizeAttachmentIds(attachmentIds);
        TripPlan trip = requireLeavableTrip(tripId, userId, now);
        List<CreditExitAttachmentEntity> attachments = requireAttachments(tripId, userId, ids);

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
                accepted.id(),
                reason,
                now,
                preview.departureAt(),
                preview.penaltyTier(),
                preview.theoreticalDelta(),
                after.score() - before.score(),
                preview.monthlyOrdinal(),
                preview.reviewStatus(),
                cleanNote,
                null,
                ledgerId,
                idempotencyKey,
                now);
        try {
            baseMapper.insert(CreditExitEventEntity.from(event));
        } catch (DuplicateKeyException exception) {
            event = findEvent(idempotencyKey, userId, tripId);
        }
        bindAttachments(attachments, event.id());
        return toResult(event, after);
    }

    @Override
    public List<LeaveRecordResponse> leaveRecords(long tripId, long userId) {
        List<CreditExitEventEntity> events = baseMapper.selectList(
                Wrappers.<CreditExitEventEntity>lambdaQuery()
                        .eq(CreditExitEventEntity::getUserId, userId)
                        .eq(CreditExitEventEntity::getTripId, tripId)
                        .orderByDesc(CreditExitEventEntity::getId));
        if (events.isEmpty()) {
            throw new LeaveRecordNotFoundException(tripId);
        }
        return events.stream()
                .map(event -> LeaveRecordResponse.from(event, attachmentsOf(event.getId())))
                .toList();
    }

    private List<CreditExitAttachmentEntity> attachmentsOf(long exitEventId) {
        return attachmentMapper.selectList(Wrappers.<CreditExitAttachmentEntity>lambdaQuery()
                .eq(CreditExitAttachmentEntity::getExitEventId, exitEventId)
                .orderByAsc(CreditExitAttachmentEntity::getId));
    }

    @Override
    public LeaveEvidenceFile loadEvidence(long attachmentId, long userId) {
        CreditExitAttachmentEntity row = attachmentMapper.selectById(attachmentId);
        if (row == null || row.getExitEventId() == null) {
            throw new LeaveRecordNotFoundException(attachmentId);
        }
        if (row.getUserId() == null || row.getUserId() != userId) {
            throw new ForbiddenActionException("exit evidence belongs to another user: " + attachmentId);
        }
        byte[] content = evidenceStorage.load(row.getFileName())
                .orElseThrow(() -> new LeaveRecordNotFoundException(attachmentId));
        return new LeaveEvidenceFile(content, row.getContentType());
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

    private TripApplication requireAcceptedCompanion(long tripId, long userId) {
        return applicationService.findAccepted(tripId, userId)
                .orElseThrow(() -> new ForbiddenActionException(
                        "only accepted companions can leave trip " + tripId));
    }

    private static String normalizeNote(CreditExitReasonEnum reason, String note) {
        String clean = note == null ? null : note.strip();
        if (clean != null && clean.isEmpty()) {
            clean = null;
        }
        if (clean != null && clean.length() > MAX_NOTE_LENGTH) {
            throw new InvalidInputException("exit note must be at most 200 characters");
        }
        if (reason.needsReview() && clean == null) {
            throw new InvalidInputException("exit note is required for safety or force majeure");
        }
        return clean;
    }

    private static List<Long> normalizeAttachmentIds(List<Long> raw) {
        if (raw == null || raw.isEmpty()) {
            return List.of();
        }
        LinkedHashSet<Long> unique = new LinkedHashSet<>();
        for (Long id : raw) {
            if (id == null || id <= 0) {
                throw new InvalidInputException("exit evidence id is invalid");
            }
            unique.add(id);
        }
        if (unique.size() > MAX_ATTACHMENTS) {
            throw new InvalidInputException("at most 3 exit evidence photos");
        }
        return List.copyOf(unique);
    }

    private List<CreditExitAttachmentEntity> requireAttachments(
            long tripId, long userId, List<Long> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        List<CreditExitAttachmentEntity> rows = attachmentMapper.selectBatchIds(ids);
        if (rows.size() != ids.size()) {
            throw new InvalidInputException("exit evidence not found");
        }
        for (CreditExitAttachmentEntity row : rows) {
            if (row.getUserId() == null || row.getUserId() != userId
                    || row.getTripId() == null || row.getTripId() != tripId
                    || row.getExitEventId() != null
                    || !evidenceStorage.exists(row.getFileName())) {
                throw new InvalidInputException("exit evidence is not available for this exit");
            }
        }
        return rows;
    }

    private void bindAttachments(List<CreditExitAttachmentEntity> attachments, long exitEventId) {
        if (attachments.isEmpty()) {
            return;
        }
        for (CreditExitAttachmentEntity row : attachments) {
            row.setExitEventId(exitEventId);
            if (attachmentMapper.updateById(row) != 1) {
                throw new InvalidInputException("exit evidence is not available for this exit");
            }
        }
    }

    private void cleanupStaleAttachments(long userId, long tripId, Instant now) {
        String cutoff = now.minus(ATTACHMENT_TTL).toString();
        List<CreditExitAttachmentEntity> stale = attachmentMapper.selectList(
                Wrappers.<CreditExitAttachmentEntity>lambdaQuery()
                        .eq(CreditExitAttachmentEntity::getUserId, userId)
                        .eq(CreditExitAttachmentEntity::getTripId, tripId)
                        .isNull(CreditExitAttachmentEntity::getExitEventId)
                        .lt(CreditExitAttachmentEntity::getCreatedAt, cutoff));
        if (stale.isEmpty()) {
            return;
        }
        attachmentMapper.deleteByIds(stale.stream().map(CreditExitAttachmentEntity::getId).toList());
        stale.forEach(row -> evidenceStorage.deleteQuietly(row.getFileName()));
    }

    private long nextAttachmentId() {
        List<CreditExitAttachmentEntity> rows = attachmentMapper.selectList(
                Wrappers.<CreditExitAttachmentEntity>lambdaQuery()
                        .select(CreditExitAttachmentEntity::getId)
                        .orderByDesc(CreditExitAttachmentEntity::getId)
                        .last("LIMIT 1"));
        return rows.isEmpty() ? 1L : rows.getFirst().getId() + 1L;
    }

    private static String originalName(MultipartFile file) {
        String name = file.getOriginalFilename();
        if (name == null || name.isBlank()) {
            return null;
        }
        String clean = name.strip();
        return clean.length() <= 160 ? clean : clean.substring(0, 160);
    }

    private static byte[] readBytes(MultipartFile file) {
        if (file == null) {
            return new byte[0];
        }
        try {
            return file.getBytes();
        } catch (IOException exception) {
            throw new UncheckedIOException("cannot read uploaded exit evidence", exception);
        }
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

    private CreditExitEventEntity findLatestEventEntity(long userId, long tripId) {
        return baseMapper.selectOne(Wrappers.<CreditExitEventEntity>lambdaQuery()
                .eq(CreditExitEventEntity::getUserId, userId)
                .eq(CreditExitEventEntity::getTripId, tripId)
                .orderByDesc(CreditExitEventEntity::getId)
                .last("LIMIT 1"));
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
