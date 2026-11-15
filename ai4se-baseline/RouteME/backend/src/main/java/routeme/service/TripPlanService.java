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
import routeme.exception.TripNotFound;
import routeme.model.DemoUser;
import routeme.model.TripPlan;
import routeme.model.TripPlanDraft;

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

    public DemoUser publisherOf(TripPlan trip) {
        return userRepository.findById(trip.publisherId()).orElseThrow();
    }
}