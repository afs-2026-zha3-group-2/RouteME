package routeme.service.impl;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import routeme.enums.ApplicationStatusEnum;
import routeme.enums.TripStatusEnum;
import routeme.enums.WriteScopeEnum;
import routeme.exception.ApplicationNotFoundException;
import routeme.exception.ApplicationNotPendingException;
import routeme.exception.DuplicateApplicationException;
import routeme.exception.ForbiddenActionException;
import routeme.exception.InvalidInputException;
import routeme.exception.TripNotOpenException;
import routeme.mapper.TripApplicationMapper;
import routeme.pojo.ChatCounterpart;
import routeme.pojo.DemoUser;
import routeme.pojo.TripApplication;
import routeme.entity.TripApplicationEntity;
import routeme.pojo.TripPlan;
import routeme.request.ApplicationCreateRequest;
import routeme.response.TripApplicationResponse;
import routeme.service.ApplicationService;
import routeme.service.AccountStatusService;
import routeme.service.CreditRestrictionGuard;
import routeme.service.DemoUserService;
import routeme.service.NotificationService;
import routeme.service.TripCompletedEvent;
import routeme.service.TripCancelledEvent;
import routeme.service.TripPlanService;

/**
 * 同行申请的业务实现：状态机、人数联动与权限校验都发生在这里。
 * 方法契约（含参数与返回值含义）以 {@link routeme.service.ApplicationService} 为准。
 */
@Service
public class ApplicationServiceImpl
        extends AbstractServiceImpl<TripApplicationMapper, TripApplicationEntity>
        implements ApplicationService {

    private static final int MAX_MESSAGE_LENGTH = 120;

    private final TripPlanService tripPlanService;
    private final DemoUserService demoUserService;
    private final CreditRestrictionGuard creditRestrictionGuard;
    private final Clock clock;
    private final AccountStatusService accountStatusService;
    private final NotificationService notificationService;

    public ApplicationServiceImpl(
            TripPlanService tripPlanService,
            DemoUserService demoUserService,
            CreditRestrictionGuard creditRestrictionGuard,
            Clock clock,
            AccountStatusService accountStatusService,
            NotificationService notificationService) {
        this.tripPlanService = tripPlanService;
        this.demoUserService = demoUserService;
        this.creditRestrictionGuard = creditRestrictionGuard;
        this.clock = clock;
        this.accountStatusService = accountStatusService;
        this.notificationService = notificationService;
    }

    @Override
    @Transactional
    public TripApplication apply(long tripId, long applicantId, ApplicationCreateRequest request) {
        accountStatusService.assertCanWrite(applicantId, WriteScopeEnum.BUSINESS);
        creditRestrictionGuard.requireNotRestricted(applicantId);
        TripPlan trip = tripPlanService.requireCurrent(tripId);
        if (trip.publisherId() == applicantId) {
            throw new ForbiddenActionException("publisher cannot apply to own trip " + tripId);
        }
        if (existsActive(tripId, applicantId)) {
            throw new DuplicateApplicationException(tripId, applicantId);
        }
        Instant now = clock.instant();
        TripStatusEnum status = trip.status(now);
        boolean open = status == TripStatusEnum.RECRUITING || status == TripStatusEnum.ONGOING;
        if (!open || trip.joinedCount() >= trip.capacity()) {
            throw new TripNotOpenException(tripId);
        }
        TripApplication created = new TripApplication(
                nextId(TripApplicationEntity::getId),
                tripId,
                applicantId,
                normalizeMessage(request == null ? null : request.message()),
                ApplicationStatusEnum.PENDING,
                now,
                null);
        save(TripApplicationEntity.from(created));
        notificationService.notifyApplicationReceived(
                trip.publisherId(), applicantId, trip.id(), created.id());
        return created;
    }

    @Override
    @Transactional
    public TripApplication cancel(long applicationId, long userId) {
        creditRestrictionGuard.requireNotRestricted(userId);
        TripApplication application = require(applicationId);
        if (application.applicantId() != userId) {
            throw new ForbiddenActionException("only the applicant can cancel application " + applicationId);
        }
        if (!application.isPending()) {
            throw new ApplicationNotPendingException(applicationId);
        }
        Instant now = clock.instant();
        updateStatus(applicationId, ApplicationStatusEnum.CANCELLED, "USER_CANCEL", now);
        return application.withStatus(ApplicationStatusEnum.CANCELLED, now);
    }

    @Override
    public Optional<TripApplication> findAccepted(long tripId, long userId) {
        return lambdaQuery()
                .eq(TripApplicationEntity::getTripId, tripId)
                .eq(TripApplicationEntity::getApplicantId, userId)
                .eq(TripApplicationEntity::getStatus, ApplicationStatusEnum.ACCEPTED.name())
                .oneOpt()
                .map(TripApplicationEntity::toApplication);
    }

    @Override
    public List<TripApplication> acceptedByUser(long userId) {
        return lambdaQuery()
                .eq(TripApplicationEntity::getApplicantId, userId)
                .eq(TripApplicationEntity::getStatus, ApplicationStatusEnum.ACCEPTED.name())
                .list().stream()
                .map(TripApplicationEntity::toApplication)
                .toList();
    }

    @Override
    @Transactional
    public void markLeft(long applicationId, String statusReason, Instant at) {
        lambdaUpdate()
                .eq(TripApplicationEntity::getId, applicationId)
                .eq(TripApplicationEntity::getStatus, ApplicationStatusEnum.ACCEPTED.name())
                .set(TripApplicationEntity::getStatus, ApplicationStatusEnum.LEFT.name())
                .set(TripApplicationEntity::getStatusReason, statusReason)
                .set(TripApplicationEntity::getDecidedAt, at.toString())
                .update();
    }

    @Override
    @Transactional
    public void cancelPendingByUser(long userId, String statusReason, Instant at) {
        lambdaUpdate()
                .eq(TripApplicationEntity::getApplicantId, userId)
                .eq(TripApplicationEntity::getStatus, ApplicationStatusEnum.PENDING.name())
                .set(TripApplicationEntity::getStatus, ApplicationStatusEnum.CANCELLED.name())
                .set(TripApplicationEntity::getStatusReason, statusReason)
                .set(TripApplicationEntity::getDecidedAt, at.toString())
                .update();
    }

    @Override
    public boolean isAccepted(long tripId, long userId) {
        return findAccepted(tripId, userId).isPresent();
    }

    @Override
    public boolean isChatPartner(long tripId, long userId) {
        return countChatPartners(tripId, userId) > 0;
    }

    @Override
    public List<ChatCounterpart> chatCounterparts(long userId) {
        List<ChatCounterpart> counterparts = new ArrayList<>();
        for (TripApplication application : mine(userId)) {
            if (application.isAccepted() || application.isLeft()) {
                TripPlan trip = tripPlanService.require(application.tripId());
                counterparts.add(new ChatCounterpart(trip.id(), trip.publisherId()));
            }
        }
        for (TripPlan trip : tripPlanService.findAllTrips()) {
            if (trip.publisherId() != userId) {
                continue;
            }
            findByTrip(trip.id()).stream()
                    .filter(application -> application.isAccepted() || application.isLeft())
                    .forEach(application ->
                            counterparts.add(new ChatCounterpart(trip.id(), application.applicantId())));
        }
        return counterparts;
    }

    @Override
    public List<TripApplication> mine(long userId) {
        return list(Wrappers.<TripApplicationEntity>lambdaQuery()
                .eq(TripApplicationEntity::getApplicantId, userId)
                .orderByDesc(TripApplicationEntity::getCreatedAt)
                .orderByDesc(TripApplicationEntity::getId)).stream()
                .map(TripApplicationEntity::toApplication)
                .toList();
    }

    @Override
    public List<TripApplication> listForPublisher(long tripId, long userId) {
        TripPlan trip = tripPlanService.require(tripId);
        if (trip.publisherId() != userId) {
            throw new ForbiddenActionException("only the publisher can review applications of trip " + tripId);
        }
        return findByTrip(tripId);
    }

    @Override
    @Transactional
    public TripApplication accept(long applicationId, long publisherId) {
        return decide(applicationId, publisherId, ApplicationStatusEnum.ACCEPTED);
    }

    @Override
    @Transactional
    public TripApplication reject(long applicationId, long publisherId) {
        return decide(applicationId, publisherId, ApplicationStatusEnum.REJECTED);
    }

    @Override
    public TripApplication require(long applicationId) {
        TripApplicationEntity entity = getById(applicationId);
        if (entity == null) {
            throw new ApplicationNotFoundException(applicationId);
        }
        return entity.toApplication();
    }

    @Override
    public TripApplicationResponse describe(TripApplication application) {
        TripPlan trip = tripPlanService.requireCurrent(application.tripId());
        DemoUser applicant = demoUserService.require(application.applicantId());
        return TripApplicationResponse.from(
                application, applicant, trip, tripPlanService.publisherOf(trip), clock.instant());
    }

    @Override
    public List<DemoUser> participants(long tripId) {
        TripPlan trip = tripPlanService.require(tripId);
        List<DemoUser> participants = new ArrayList<>();
        participants.add(tripPlanService.publisherOf(trip));
        findByTrip(tripId).stream()
                .filter(TripApplication::isAccepted)
                .forEach(application -> participants.add(demoUserService.require(application.applicantId())));
        return participants;
    }

    private TripApplication decide(long applicationId, long publisherId, ApplicationStatusEnum next) {
        creditRestrictionGuard.requireNotRestricted(publisherId);
        TripApplication application = require(applicationId);
        TripPlan trip = tripPlanService.requireCurrent(application.tripId());
        if (trip.publisherId() != publisherId) {
            throw new ForbiddenActionException("only the publisher can decide application " + applicationId);
        }
        if (!application.isPending()) {
            throw new ApplicationNotPendingException(applicationId);
        }
        Instant now = clock.instant();
        TripStatusEnum status = trip.status(now);
        if (status == TripStatusEnum.COMPLETED || status == TripStatusEnum.CANCELLED) {
            throw new TripNotOpenException(trip.id());
        }
        if (next == ApplicationStatusEnum.ACCEPTED) {
            boolean open = status == TripStatusEnum.RECRUITING || status == TripStatusEnum.ONGOING;
            if (!open || trip.joinedCount() >= trip.capacity()) {
                throw new TripNotOpenException(trip.id());
            }
            tripPlanService.addCompanion(trip.id());
        }
updateStatus(applicationId, next,
                next == ApplicationStatusEnum.REJECTED ? "PUBLISHER_REJECT" : null, now);
        if (next == ApplicationStatusEnum.ACCEPTED) {
            notificationService.notifyApplicationAccepted(
                    application.applicantId(), publisherId, trip.id(), application.id());
            TripPlan updated = tripPlanService.require(trip.id());
            if (updated.joinedCount() >= updated.capacity()) {
                for (DemoUser participant : participants(trip.id())) {
                    notificationService.notifyTripFull(participant.id(), publisherId, trip.id());
                }
            }
        } else {
            notificationService.notifyApplicationRejected(
                    application.applicantId(), publisherId, trip.id(), application.id());
        }
        return application.withStatus(next, now);
    }

    @Override
    @Transactional
    public void cancelPending(long tripId, String statusReason, Instant now) {
        lambdaUpdate()
                .eq(TripApplicationEntity::getTripId, tripId)
                .eq(TripApplicationEntity::getStatus, ApplicationStatusEnum.PENDING.name())
                .set(TripApplicationEntity::getStatus, ApplicationStatusEnum.CANCELLED.name())
                .set(TripApplicationEntity::getStatusReason, statusReason)
                .set(TripApplicationEntity::getDecidedAt, now.toString())
                .update();
    }

    @EventListener
    @Transactional
    public void onTripCompleted(TripCompletedEvent event) {
        TripPlan trip = tripPlanService.require(event.tripId());
        cancelPending(event.tripId(), "TRIP_COMPLETED", event.completedAt());
        for (TripApplication application : findByTrip(event.tripId())) {
            if (application.isAccepted()) {
                notificationService.notifyTripCompleted(
                        application.applicantId(), trip.publisherId(), trip.id());
            }
        }
    }

    @EventListener
    @Transactional
    public void onTripCancelled(TripCancelledEvent event) {
        // 待处理申请随行程取消；原因属于行程（cancel_reason），不是申请人受限。
        TripPlan trip = tripPlanService.require(event.tripId());
        List<TripApplication> pending = findByTrip(event.tripId()).stream()
                .filter(TripApplication::isPending)
                .toList();
        cancelPending(event.tripId(), "TRIP_CANCELLED", event.cancelledAt());
        for (TripApplication application : pending) {
            notificationService.notifyApplicationClosed(
                    application.applicantId(),
                    trip.publisherId(),
                    trip.id(),
                    application.id(),
                    event.cancelReason());
        }
        for (TripApplication application : findByTrip(event.tripId())) {
            if (application.isAccepted()) {
                notificationService.notifyTripCancelled(
                        application.applicantId(),
                        trip.publisherId(),
                        trip.id(),
                        event.cancelReason());
            }
        }
    }

    private List<TripApplication> findByTrip(long tripId) {
        return list(Wrappers.<TripApplicationEntity>lambdaQuery()
                .eq(TripApplicationEntity::getTripId, tripId)
                .orderByAsc(TripApplicationEntity::getCreatedAt)
                .orderByAsc(TripApplicationEntity::getId)).stream()
                .map(TripApplicationEntity::toApplication)
                .toList();
    }



    private long countChatPartners(long tripId, long applicantId) {
        return count(Wrappers.<TripApplicationEntity>lambdaQuery()
                .eq(TripApplicationEntity::getTripId, tripId)
                .eq(TripApplicationEntity::getApplicantId, applicantId)
                .in(TripApplicationEntity::getStatus,
                        ApplicationStatusEnum.ACCEPTED.name(),
                        ApplicationStatusEnum.LEFT.name()));
    }

    private boolean existsActive(long tripId, long applicantId) {
        return count(Wrappers.<TripApplicationEntity>lambdaQuery()
                .eq(TripApplicationEntity::getTripId, tripId)
                .eq(TripApplicationEntity::getApplicantId, applicantId)
                .in(TripApplicationEntity::getStatus,
                        ApplicationStatusEnum.PENDING.name(),
                        ApplicationStatusEnum.ACCEPTED.name())) > 0;
    }

    private void updateStatus(
            long applicationId, ApplicationStatusEnum status, String statusReason, Instant decidedAt) {
        lambdaUpdate()
                .eq(TripApplicationEntity::getId, applicationId)
                .set(TripApplicationEntity::getStatus, status.name())
                .set(TripApplicationEntity::getStatusReason, statusReason)
                .set(TripApplicationEntity::getDecidedAt, decidedAt == null ? null : decidedAt.toString())
                .update();
    }

    private String normalizeMessage(String message) {
        if (message == null) {
            return null;
        }
        String trimmed = message.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        if (trimmed.length() > MAX_MESSAGE_LENGTH) {
            throw new InvalidInputException(
                    "application message must be at most " + MAX_MESSAGE_LENGTH + " chars");
        }
        return trimmed;
    }
}