package routeme.service;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import routeme.dao.TripPlanRepository;
import routeme.dao.UserRepository;
import routeme.dto.TripCreateRequest;
import routeme.dto.TripQuery;
import routeme.exception.ForbiddenAction;
import routeme.exception.InvalidInput;
import routeme.exception.TripNotFound;
import routeme.exception.TripNotOpen;
import routeme.model.DemoUser;
import routeme.model.TripPlan;
import routeme.model.TripPlanDraft;
import routeme.model.TripStatus;

@Service
public class TripPlanService {

    private final TripPlanRepository tripPlanRepository;
    private final UserRepository userRepository;
    private final TripPlanQueryService tripPlanQueryService;
    private final Clock clock;

    public TripPlanService(
            TripPlanRepository tripPlanRepository,
            UserRepository userRepository,
            TripPlanQueryService tripPlanQueryService,
            Clock clock) {
        this.tripPlanRepository = tripPlanRepository;
        this.userRepository = userRepository;
        this.tripPlanQueryService = tripPlanQueryService;
        this.clock = clock;
    }

    @Transactional
    public TripPlan create(TripCreateRequest request, long publisherId) {
        Instant now = clock.instant();
        TripPlanDraft draft = new TripPlanDraft(
                publisherId,
                request.title(),
                request.destination(),
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
        TripPlan saved = validated.withId(tripPlanRepository.nextId());
        tripPlanRepository.insert(saved);
        return saved;
    }

    public List<TripPlan> search(TripQuery query) {
        return tripPlanQueryService.search(
                tripPlanRepository.findUnfinished(),
                query,
                publisherId -> userRepository.findById(publisherId).map(DemoUser::nickname).orElse(""));
    }

    public TripPlan require(long tripId) {
        return tripPlanRepository.findById(tripId)
                .orElseThrow(() -> new TripNotFound(tripId));
    }

        @Transactional
            public TripPlan complete(long tripId, long userId) {
                TripPlan trip = require(tripId);
                if (trip.publisherId() != userId) {
                    throw new ForbiddenAction("only the publisher can complete trip " + tripId);
                }
                if (trip.status() == TripStatus.COMPLETED) {
                    throw new TripNotOpen(tripId);
                }
                tripPlanRepository.markCompleted(tripId, clock.instant());
                return require(tripId);
            }

            @Transactional
            public TripPlan addCompanion(long tripId) {
                TripPlan trip = require(tripId);
                if (trip.status() != TripStatus.RECRUITING) {
                    throw new TripNotOpen(tripId);
                }
                tripPlanRepository.updateJoinedCount(tripId, trip.joinedCount() + 1, clock.instant());
                return require(tripId);
            }

            @Transactional
            public TripPlan removeCompanion(long tripId) {
                TripPlan trip = require(tripId);
                if (trip.status() == TripStatus.COMPLETED) {
                    throw new TripNotOpen(tripId);
                }
                if (trip.joinedCount() <= 1) {
                    throw new InvalidInput("trip has no companion to remove: " + tripId);
                }
                tripPlanRepository.updateJoinedCount(tripId, trip.joinedCount() - 1, clock.instant());
                return require(tripId);
            }

    public DemoUser publisherOf(TripPlan trip) {
        return userRepository.findById(trip.publisherId()).orElseThrow();
    }
}