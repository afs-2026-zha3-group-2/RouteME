package routeme.controller;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import routeme.request.TripCreateRequest;
import routeme.request.TripCancelRequest;
import routeme.request.TripMeetingRequest;
import routeme.response.PageResponse;
import routeme.response.TripDetailResponse;
import routeme.request.TripQuery;
import routeme.response.TripSummaryResponse;
import routeme.pojo.DemoUser;
import routeme.pojo.PageResult;
import routeme.pojo.TripPlan;
import routeme.param.PageParam;
import routeme.param.TripQueryParam;
import routeme.service.ApplicationService;
import routeme.service.DemoUserService;
import routeme.service.TripPlanService;

@RestController
@RequestMapping("/api/trips")
public class TripController {

    private final DemoUserService demoUserService;
    private final TripPlanService tripPlanService;
    private final ApplicationService applicationService;
    private final Clock clock;

    public TripController(
            DemoUserService demoUserService,
            TripPlanService tripPlanService,
            ApplicationService applicationService,
            Clock clock) {
        this.demoUserService = demoUserService;
        this.tripPlanService = tripPlanService;
        this.applicationService = applicationService;
        this.clock = clock;
    }

    @GetMapping
    public PageResponse<TripSummaryResponse> list(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestParam(name = "destination_code", required = false) String destinationCode,
            @RequestParam(name = "date_from", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(name = "date_to", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String tags,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        demoUserService.require(userId);
        TripQuery query = new TripQuery(
                destinationCode, dateFrom, dateTo, TripQueryParam.parseTags(tags), TripQueryParam.parseSort(sort));
        PageResult<TripPlan> result = tripPlanService.searchPage(query, PageParam.parse(page, size));
        return PageResponse.from(result, trip -> TripSummaryResponse.from(trip, tripPlanService.publisherOf(trip), clock.instant()));
    }

    @GetMapping("/{tripId}")
    public TripDetailResponse detail(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable long tripId) {
        demoUserService.require(userId);
        TripPlan trip = tripPlanService.requireCurrent(tripId);
        DemoUser publisher = tripPlanService.publisherOf(trip);
        boolean includeCancelDetail = trip.publisherId() == userId
                || applicationService.isAccepted(tripId, userId);
        return TripDetailResponse.from(
                trip, publisher, applicationService.participants(tripId), clock.instant(), includeCancelDetail);
    }

    @PostMapping
    public ResponseEntity<TripDetailResponse> create(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestBody TripCreateRequest request) {
        DemoUser publisher = demoUserService.require(userId);
        // 信用限制统一由 TripPlanServiceImpl.create 的 CreditRestrictionGuard 守卫（403 CREDIT_RESTRICTED）。
        TripPlan saved = tripPlanService.create(request, publisher.id());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(TripDetailResponse.from(saved, publisher, List.of(publisher), clock.instant(), true));
    }

    @PostMapping("/{tripId}/cancel")
    public TripDetailResponse cancel(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable long tripId,
            @RequestBody TripCancelRequest request) {
        DemoUser publisher = demoUserService.require(userId);
        TripPlan cancelled = tripPlanService.cancel(tripId, publisher.id(), request);
        return TripDetailResponse.from(
                cancelled, publisher, applicationService.participants(tripId), clock.instant(), true);
    }

    @PostMapping("/{tripId}/complete")
    public TripDetailResponse complete(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable long tripId) {
        DemoUser publisher = demoUserService.require(userId);
        TripPlan completed = tripPlanService.complete(tripId, publisher.id());
        return TripDetailResponse.from(
                completed, publisher, applicationService.participants(tripId), clock.instant(), true);
    }

    @PutMapping("/{tripId}/meeting")
    public TripDetailResponse updateMeeting(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable long tripId,
            @RequestBody TripMeetingRequest request) {
        DemoUser publisher = demoUserService.require(userId);
        TripPlan updated = tripPlanService.updateMeeting(tripId, publisher.id(), request);
        return TripDetailResponse.from(
                updated, publisher, applicationService.participants(tripId), clock.instant(), true);
    }
}