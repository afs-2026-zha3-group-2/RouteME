package routeme.service.impl;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import routeme.enums.TripStatusEnum;
import routeme.pojo.DemoUser;
import routeme.pojo.TripApplication;
import routeme.pojo.TripPlan;
import routeme.response.MyTripsResponse;
import routeme.response.PendingApplicationCount;
import routeme.response.TripSummaryResponse;
import routeme.service.ApplicationService;
import routeme.service.MyTripsService;
import routeme.service.TripPlanService;

/**
 * 我的旅行的聚合实现：按发布 / 申请 / 已匹配 / 已完成四组归并。
 * 方法契约以 {@link routeme.service.MyTripsService} 为准。
 */
@Service
public class MyTripsServiceImpl implements MyTripsService {

    private final TripPlanService tripPlanService;
    private final ApplicationService applicationService;
    private final Clock clock;

    public MyTripsServiceImpl(
            TripPlanService tripPlanService, ApplicationService applicationService, Clock clock) {
        this.tripPlanService = tripPlanService;
        this.applicationService = applicationService;
        this.clock = clock;
    }

    @Override
    public MyTripsResponse forUser(long userId) {
        List<TripPlan> trips = tripPlanService.findAllTrips();
        Instant now = clock.instant();
        List<TripApplication> applications = applicationService.mine(userId);
        Set<Long> acceptedTripIds = applications.stream()
                .filter(TripApplication::isAccepted)
                .map(TripApplication::tripId)
                .collect(Collectors.toSet());

        List<TripPlan> published = trips.stream()
                .filter(trip -> trip.publisherId() == userId)
                .toList();
        List<TripPlan> matched = trips.stream()
                .filter(trip -> trip.status(now) != TripStatusEnum.COMPLETED
                        && trip.publisherId() != userId
                        && acceptedTripIds.contains(trip.id()))
                .toList();
        List<TripPlan> completed = trips.stream()
                .filter(trip -> trip.status(now) == TripStatusEnum.COMPLETED
                        && (trip.publisherId() == userId || acceptedTripIds.contains(trip.id())))
                .toList();
        List<PendingApplicationCount> pendingApplications = pendingApplications(published, userId);
        int pendingCount = pendingApplications.stream()
                .mapToInt(PendingApplicationCount::count)
                .sum();

        return new MyTripsResponse(
                published.stream().map(trip -> summary(trip, now)).toList(),
                applications.stream().map(applicationService::describe).toList(),
                matched.stream().map(trip -> summary(trip, now)).toList(),
                completed.stream().map(trip -> summary(trip, now)).toList(),
                pendingCount,
                pendingApplications);
    }

    private List<PendingApplicationCount> pendingApplications(List<TripPlan> published, long userId) {
        return published.stream()
                .map(trip -> new PendingApplicationCount(trip.id(), pendingCountOf(trip, userId)))
                .filter(item -> item.count() > 0)
                .toList();
    }

    private int pendingCountOf(TripPlan trip, long userId) {
        return (int) applicationService.listForPublisher(trip.id(), userId).stream()
                .filter(TripApplication::isPending)
                .count();
    }

    private TripSummaryResponse summary(TripPlan trip, Instant now) {
        DemoUser publisher = tripPlanService.publisherOf(trip);
        return TripSummaryResponse.from(trip, publisher, now);
    }
}