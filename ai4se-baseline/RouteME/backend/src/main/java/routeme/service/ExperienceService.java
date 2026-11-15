package routeme.service;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import routeme.dao.TripExperienceRepository;
import routeme.dao.UserRepository;
import routeme.dto.ExperienceResponse;
import routeme.dto.ExperienceSaveResult;
import routeme.dto.ExperienceWriteRequest;
import routeme.exception.ExperienceNotAllowed;
import routeme.model.DemoUser;
import routeme.model.TripExperience;
import routeme.model.TripPlan;
import routeme.model.TripStatus;

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
    public ExperienceSaveResult upsert(long tripId, long authorId, ExperienceWriteRequest request) {
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
        return new ExperienceSaveResult(describe(saved), created);
    }

    public List<ExperienceResponse> listAll(String q, String destination, Set<String> tags) {
        return experienceRepository.findAll().stream()
                .filter(experience -> matches(experience, q, destination, tags))
                .map(this::describe)
                .toList();
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
        if (trip.status() != TripStatus.COMPLETED) {
            throw new ExperienceNotAllowed(trip.id(), authorId);
        }
        boolean participant = applicationService.participants(trip.id()).stream()
                .anyMatch(user -> user.id() == authorId);
        if (!participant) {
            throw new ExperienceNotAllowed(trip.id(), authorId);
        }
    }

    private ExperienceResponse describe(TripExperience experience) {
        TripPlan trip = tripPlanService.require(experience.tripId());
        DemoUser publisher = tripPlanService.publisherOf(trip);
        DemoUser author = userRepository.findById(experience.authorId()).orElseThrow();
        return ExperienceResponse.from(experience, trip, publisher, author);
    }
}