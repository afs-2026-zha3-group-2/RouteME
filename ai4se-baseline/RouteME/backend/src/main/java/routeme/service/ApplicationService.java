package routeme.service;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import routeme.dao.TripApplicationRepository;
import routeme.dto.ApplicationCreateRequest;
import routeme.dto.TripApplicationResponse;
import routeme.exception.ApplicationNotFound;
import routeme.exception.ApplicationNotPending;
import routeme.exception.DuplicateApplication;
import routeme.exception.ForbiddenAction;
import routeme.exception.InvalidInput;
import routeme.exception.TripNotOpen;
import routeme.model.ApplicationStatus;
import routeme.model.DemoUser;
import routeme.model.TripApplication;
import routeme.model.TripPlan;
import routeme.model.TripStatus;

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
            throw new ForbiddenAction("publisher cannot apply to own trip " + tripId);
        }
        if (applicationRepository.existsActive(tripId, applicantId)) {
            throw new DuplicateApplication(tripId, applicantId);
        }
        if (trip.status() != TripStatus.RECRUITING) {
            throw new TripNotOpen(tripId);
        }
        String message = normalizeMessage(request == null ? null : request.message());
        TripApplication created = new TripApplication(
                applicationRepository.nextId(),
                tripId,
                applicantId,
                message,
                ApplicationStatus.PENDING,
                clock.instant(),
                null);
        applicationRepository.insert(created);
        return created;
    }

    @Transactional
    public TripApplication cancel(long applicationId, long userId) {
        TripApplication application = require(applicationId);
        if (application.applicantId() != userId) {
            throw new ForbiddenAction("only the applicant can cancel application " + applicationId);
        }
        if (!application.isPending()) {
            throw new ApplicationNotPending(applicationId);
        }
        Instant now = clock.instant();
        applicationRepository.updateStatus(applicationId, ApplicationStatus.CANCELLED, now);
        return application.withStatus(ApplicationStatus.CANCELLED, now);
    }

    public List<TripApplication> mine(long userId) {
        return applicationRepository.findByApplicant(userId);
    }

    public TripApplication require(long applicationId) {
        return applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ApplicationNotFound(applicationId));
    }

    public TripApplicationResponse describe(TripApplication application) {
        TripPlan trip = tripPlanService.require(application.tripId());
        DemoUser applicant = demoUserService.require(application.applicantId());
        return TripApplicationResponse.from(application, applicant, trip, tripPlanService.publisherOf(trip));
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
            throw new InvalidInput("application message exceeds " + MAX_MESSAGE_LENGTH + " characters");
        }
        return trimmed;
    }
}