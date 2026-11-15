package routeme.service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import routeme.response.MyTripsResponse;
import routeme.response.TripSummaryResponse;
import routeme.model.DemoUser;
import routeme.model.TripApplication;
import routeme.model.TripPlan;
import routeme.repository.TripApplicationRepository;
import routeme.repository.TripPlanRepository;

@Service
public class MyTripsService {

    private final TripPlanRepository tripPlanRepository;
    private final TripApplicationRepository applicationRepository;
    private final TripPlanService tripPlanService;
    private final ApplicationService applicationService;

    public MyTripsService(
            TripPlanRepository tripPlanRepository,
            TripApplicationRepository applicationRepository,
            TripPlanService tripPlanService,
            ApplicationService applicationService) {
        this.tripPlanRepository = tripPlanRepository;
        this.applicationRepository = applicationRepository;
        this.tripPlanService = tripPlanService;
        this.applicationService = applicationService;
    }

    public MyTripsResponse forUser(long userId) {
        List<TripPlan> trips = tripPlanRepository.findAll();
        List<TripApplication> applications = applicationRepository.findByApplicant(userId);
        Set<Long> acceptedTripIds = applications.stream()
                .filter(TripApplication::isAccepted)
                .map(TripApplication::tripId)
                .collect(Collectors.toSet());

        List<TripPlan> published = trips.stream()
                .filter(trip -> trip.publisherId() == userId)
                .toList();
        List<TripPlan> matched = trips.stream()
                .filter(trip -> trip.completedAt() == null
                        && trip.publisherId() != userId
                        && acceptedTripIds.contains(trip.id()))
                .toList();
        List<TripPlan> completed = trips.stream()
                .filter(trip -> trip.completedAt() != null
                        && (trip.publisherId() == userId || acceptedTripIds.contains(trip.id())))
                .toList();
        int pendingCount = (int) published.stream()
                        .flatMap(trip -> applicationRepository.findByTrip(trip.id()).stream())
                        .filter(TripApplication::isPending)
                        .count();

        return new MyTripsResponse(
                published.stream().map(this::summary).toList(),
                applications.stream().map(applicationService::describe).toList(),
                matched.stream().map(this::summary).toList(),
                completed.stream().map(this::summary).toList(),
                pendingCount);
    }

    private TripSummaryResponse summary(TripPlan trip) {
        DemoUser publisher = tripPlanService.publisherOf(trip);
        return TripSummaryResponse.from(trip, publisher);
    }
}