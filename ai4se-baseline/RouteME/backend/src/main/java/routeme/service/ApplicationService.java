package routeme.service;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import routeme.request.ApplicationCreateRequest;
import routeme.response.TripApplicationResponse;
import routeme.enums.ApplicationStatusEnum;
import routeme.enums.TripStatusEnum;
import routeme.exception.ApplicationNotFoundException;
import routeme.exception.ApplicationNotPendingException;
import routeme.exception.DuplicateApplicationException;
import routeme.exception.ForbiddenActionException;
import routeme.exception.InvalidInputException;
import routeme.exception.TripNotOpenException;
import routeme.model.DemoUser;
import routeme.model.TripApplication;
import routeme.model.TripPlan;
import routeme.repository.TripApplicationRepository;

@Service
public class ApplicationService {

    private static final int MAX_MESSAGE_LENGTH = 120;

    private final TripApplicationRepository applicationRepository;
    private final TripPlanService tripPlanService;
    private final DemoUserService demoUserService;
    private final Clock clock;

    public ApplicationService(
            TripApplicationRepository applicationRepository,
            TripPlanService tripPlanService,
            DemoUserService demoUserService,
            Clock clock) {
        this.applicationRepository = applicationRepository;
        this.tripPlanService = tripPlanService;
        this.demoUserService = demoUserService;
        this.clock = clock;
    }

    @Transactional
    public TripApplication apply(long tripId, long applicantId, ApplicationCreateRequest request) {
        TripPlan trip = tripPlanService.require(tripId);
        if (trip.publisherId() == applicantId) {
            throw new ForbiddenActionException("publisher cannot apply to own trip " + tripId);
        }
        if (applicationRepository.existsActive(tripId, applicantId)) {
            throw new DuplicateApplicationException(tripId, applicantId);
        }
        if (trip.status() != TripStatusEnum.RECRUITING) {
            throw new TripNotOpenException(tripId);
        }
        String message = normalizeMessage(request == null ? null : request.message());
        TripApplication created = new TripApplication(
                applicationRepository.nextId(),
                tripId,
                applicantId,
                message,
                ApplicationStatusEnum.PENDING,
                clock.instant(),
                null);
        applicationRepository.insert(created);
        return created;
    }

    @Transactional
    public TripApplication cancel(long applicationId, long userId) {
        TripApplication application = require(applicationId);
        if (application.applicantId() != userId) {
            throw new ForbiddenActionException("only the applicant can cancel application " + applicationId);
        }
        if (!application.isPending()) {
            throw new ApplicationNotPendingException(applicationId);
        }
        Instant now = clock.instant();
        applicationRepository.updateStatus(applicationId, ApplicationStatusEnum.CANCELLED, now);
        return application.withStatus(ApplicationStatusEnum.CANCELLED, now);
    }

    @Transactional
    public void leave(long tripId, long userId) {
        TripPlan trip = tripPlanService.require(tripId);
        if (trip.publisherId() == userId) {
            throw new ForbiddenActionException("publisher cannot leave own trip " + tripId);
        }
        TripApplication accepted = applicationRepository.findAccepted(tripId, userId)
                .orElseThrow(() -> new ForbiddenActionException("only accepted companions can leave trip " + tripId));
        tripPlanService.removeCompanion(tripId);
        applicationRepository.updateStatus(accepted.id(), ApplicationStatusEnum.CANCELLED, clock.instant());
    }

    public boolean isAccepted(long tripId, long userId) {
        return applicationRepository.findAccepted(tripId, userId).isPresent();
    }

    public List<TripApplication> mine(long userId) {
        return applicationRepository.findByApplicant(userId);
    }

        public List<TripApplication> listForPublisher(long tripId, long userId) {
            TripPlan trip = tripPlanService.require(tripId);
            if (trip.publisherId() != userId) {
                throw new ForbiddenActionException("only the publisher can review applications of trip " + tripId);
            }
            return applicationRepository.findByTrip(tripId);
        }

        @Transactional
        public TripApplication accept(long applicationId, long publisherId) {
            return decide(applicationId, publisherId, ApplicationStatusEnum.ACCEPTED);
        }

        @Transactional
        public TripApplication reject(long applicationId, long publisherId) {
            return decide(applicationId, publisherId, ApplicationStatusEnum.REJECTED);
        }

        private TripApplication decide(long applicationId, long publisherId, ApplicationStatusEnum next) {
            TripApplication application = require(applicationId);
            TripPlan trip = tripPlanService.require(application.tripId());
            if (trip.publisherId() != publisherId) {
                throw new ForbiddenActionException("only the publisher can decide application " + applicationId);
            }
            if (!application.isPending()) {
                throw new ApplicationNotPendingException(applicationId);
            }
            if (next == ApplicationStatusEnum.ACCEPTED) {
                tripPlanService.addCompanion(trip.id());
            }
            Instant now = clock.instant();
            applicationRepository.updateStatus(applicationId, next, now);
            return application.withStatus(next, now);
        }

    public TripApplication require(long applicationId) {
        return applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ApplicationNotFoundException(applicationId));
    }

    public TripApplicationResponse describe(TripApplication application) {
        TripPlan trip = tripPlanService.require(application.tripId());
        DemoUser applicant = demoUserService.require(application.applicantId());
        return TripApplicationResponse.from(application, applicant, trip, tripPlanService.publisherOf(trip));
    }

        /** 当前同行者：发布者在最前，其后按申请时间排列的已接受同行者。 */
        public List<DemoUser> participants(long tripId) {
            TripPlan trip = tripPlanService.require(tripId);
            List<DemoUser> participants = new ArrayList<>();
            participants.add(tripPlanService.publisherOf(trip));
            applicationRepository.findByTrip(tripId).stream()
                    .filter(TripApplication::isAccepted)
                    .forEach(application -> participants.add(demoUserService.require(application.applicantId())));
            return participants;
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
            throw new InvalidInputException("application message exceeds " + MAX_MESSAGE_LENGTH + " characters");
        }
        return trimmed;
    }
}