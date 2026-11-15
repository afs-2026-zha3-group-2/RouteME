package routeme.service.impl;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import routeme.pojo.DemoUser;
import routeme.pojo.TripApplication;
import routeme.pojo.TripPlan;
import routeme.response.MyTripsResponse;
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

    public MyTripsServiceImpl(TripPlanService tripPlanService, ApplicationService applicationService) {
        this.tripPlanService = tripPlanService;
        this.applicationService = applicationService;
    }

    @Override
    public MyTripsResponse forUser(long userId) {
        List<TripPlan> trips = tripPlanService.findAllTrips();
        List<TripApplication> applications = applicationService.mine(userId);
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
                .flatMap(trip -> applicationService.listForPublisher(trip.id(), userId).stream())
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