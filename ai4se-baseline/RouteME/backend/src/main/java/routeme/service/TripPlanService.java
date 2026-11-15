package routeme.service;

import java.time.Clock;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import routeme.dao.TripPlanRepository;
import routeme.dto.TripCreateRequest;
import routeme.model.TripPlan;
import routeme.model.TripPlanDraft;

@Service
public class TripPlanService {

    private final TripPlanRepository tripPlanRepository;
    private final Clock clock;

    public TripPlanService(TripPlanRepository tripPlanRepository, Clock clock) {
        this.tripPlanRepository = tripPlanRepository;
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
}