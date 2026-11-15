package routeme.service;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import routeme.response.ExperienceResponse;
import routeme.response.ExperienceSaveResponse;
import routeme.request.ExperienceWriteRequest;
import routeme.enums.TripStatusEnum;
import routeme.exception.ExperienceNotAllowedException;
import routeme.model.DemoUser;
import routeme.model.PageResult;
import routeme.model.TripExperience;
import routeme.model.TripPlan;
import routeme.param.PageParam;
import routeme.repository.TripExperienceRepository;
import routeme.repository.UserRepository;

@Service
public class ExperienceService {

    private final TripExperienceRepository experienceRepository;
    private final TripPlanService tripPlanService;
    private final ApplicationService applicationService;
    private final UserRepository userRepository;
    private final Clock clock;

    public ExperienceService(
            TripExperienceRepository experienceRepository,
            TripPlanService tripPlanService,
            ApplicationService applicationService,
            UserRepository userRepository,
            Clock clock) {
        this.experienceRepository = experienceRepository;
        this.tripPlanService = tripPlanService;
        this.applicationService = applicationService;
        this.userRepository = userRepository;
        this.clock = clock;
    }

    @Transactional
    public ExperienceSaveResponse upsert(long tripId, long authorId, ExperienceWriteRequest request) {
        TripPlan trip = tripPlanService.require(tripId);
        requireCanShare(trip, authorId);
        Instant now = clock.instant();
        TripExperience existing = experienceRepository.findByTripAndAuthor(tripId, authorId).orElse(null);
        TripExperience saved;
        boolean created;
        if (existing == null) {
            saved = TripExperience.create(
                            tripId, authorId, request.content(), request.intensity(), request.advice(), now)
                    .withId(experienceRepository.nextId());
            experienceRepository.insert(saved);
            created = true;
        } else {
            saved = existing.withContent(request.content(), request.intensity(), request.advice(), now);
            experienceRepository.update(saved);
            created = false;
        }
        return new ExperienceSaveResponse(describe(saved), created);
    }

    public List<ExperienceResponse> listAll(String q, String destination, Set<String> tags) {
        return experienceRepository.findAll().stream()
                .filter(experience -> matches(experience, q, destination, tags))
                .map(this::describe)
                .toList();
    }

    /**
     * 分页浏览游后体验：过滤、排序与分页在数据库完成（join 行程表）。
     */
    public PageResult<ExperienceResponse> listPage(String q, String destination, Set<String> tags, PageParam param) {
        String keyword = q == null || q.isBlank() ? null : q.trim();
        PageResult<TripExperience> page =
                experienceRepository.findPage(keyword, destination, tags == null ? Set.of() : tags,
                        param.page(), param.size());
        return new PageResult<>(
                page.items().stream().map(this::describe).toList(),
                page.page(),
                page.size(),
                page.total());
    }

    public List<ExperienceResponse> listByTrip(long tripId) {
        tripPlanService.require(tripId);
        return experienceRepository.findByTrip(tripId).stream()
                .map(this::describe)
                .toList();
    }

    public List<ExperienceResponse> mine(long authorId) {
        return experienceRepository.findByAuthor(authorId).stream()
                .map(this::describe)
                .toList();
    }

    private boolean matches(TripExperience experience, String q, String destination, Set<String> tags) {
        TripPlan trip = tripPlanService.require(experience.tripId());
        if (destination != null && !destination.isBlank() && !destination.equals(trip.destination())) {
            return false;
        }
        if (tags != null && !tags.isEmpty() && trip.tags().stream().noneMatch(tags::contains)) {
            return false;
        }
        if (q == null || q.isBlank()) {
            return true;
        }
        String needle = q.trim().toLowerCase();
        String haystack = String.join(" ",
                        trip.title(), trip.destination(), experience.content(), experience.advice())
                .toLowerCase();
        return haystack.contains(needle);
    }

    private void requireCanShare(TripPlan trip, long authorId) {
        if (trip.status() != TripStatusEnum.COMPLETED) {
            throw new ExperienceNotAllowedException(trip.id(), authorId);
        }
        boolean participant = applicationService.participants(trip.id()).stream()
                .anyMatch(user -> user.id() == authorId);
        if (!participant) {
            throw new ExperienceNotAllowedException(trip.id(), authorId);
        }
    }

    private ExperienceResponse describe(TripExperience experience) {
        TripPlan trip = tripPlanService.require(experience.tripId());
        DemoUser publisher = tripPlanService.publisherOf(trip);
        DemoUser author = userRepository.findById(experience.authorId()).orElseThrow();
        return ExperienceResponse.from(experience, trip, publisher, author);
    }
}