package routeme.service;

import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;

import routeme.request.TripQuery;
import routeme.exception.TripNotFoundException;
import routeme.model.DemoUser;
import routeme.model.MatchCandidate;
import routeme.model.PageResult;
import routeme.model.TripMatch;
import routeme.model.TripPlan;
import routeme.param.PageParam;
import routeme.repository.TripPlanRepository;
import routeme.repository.UserRepository;

@Service
public class MatchService {

    private final TripPlanRepository tripPlanRepository;
    private final UserRepository userRepository;
    private final TripPlanQueryService tripPlanQueryService;

    public MatchService(
            TripPlanRepository tripPlanRepository,
            UserRepository userRepository,
            TripPlanQueryService tripPlanQueryService) {
        this.tripPlanRepository = tripPlanRepository;
        this.userRepository = userRepository;
        this.tripPlanQueryService = tripPlanQueryService;
    }

    public List<MatchCandidate> search(TripQuery query, long userId) {
        DemoUser me = requireUser(userId);
        TripPlan reference = tripPlanRepository.findLatestUnfinishedByPublisher(userId).orElse(null);
        List<TripPlan> trips = tripPlanQueryService.search(
                tripPlanRepository.findUnfinished(),
                query,
                publisherId -> userRepository.findById(publisherId).map(DemoUser::nickname).orElse(""));
        List<MatchCandidate> candidates = trips.stream()
                .map(trip -> new MatchCandidate(trip, requirePublisher(trip), match(trip, reference, query, me)))
                .toList();
        if (query.sort() == TripQuery.SortOrder.MATCH) {
            return candidates.stream()
                    .sorted(Comparator.comparingInt((MatchCandidate candidate) -> candidate.match().score())
                            .reversed()
                            .thenComparing(candidate -> candidate.trip().createdAt(), Comparator.reverseOrder()))
                    .toList();
        }
        return candidates;
    }

    /**
     * 匹配分在 Java 中计算（SQL 无法排序），因此先算出完整候选再切页；total 反映筛选后的命中数。
     */
    public PageResult<MatchCandidate> searchPage(TripQuery query, long userId, PageParam param) {
        List<MatchCandidate> all = search(query, userId);
        return new PageResult<>(param.slice(all), param.page(), param.size(), all.size());
    }

    public MatchCandidate matchFor(long tripId, long userId) {
        DemoUser me = requireUser(userId);
        TripPlan trip = tripPlanRepository.findById(tripId).orElseThrow(() -> new TripNotFoundException(tripId));
        TripPlan reference = tripPlanRepository.findLatestUnfinishedByPublisher(userId).orElse(null);
        TripQuery empty = TripQuery.empty();
        return new MatchCandidate(trip, requirePublisher(trip), match(trip, reference, empty, me));
    }

    private TripMatch match(TripPlan trip, TripPlan reference, TripQuery query, DemoUser me) {
        return TripMatch.of(trip, reference, query.destination(), query.dateFrom(), me.interests());
    }

    private DemoUser requireUser(long userId) {
        return userRepository.findById(userId).orElseThrow(() -> new IllegalStateException("unknown user " + userId));
    }

    private DemoUser requirePublisher(TripPlan trip) {
        return userRepository.findById(trip.publisherId())
                .orElseThrow(() -> new IllegalStateException("unknown publisher " + trip.publisherId()));
    }
}