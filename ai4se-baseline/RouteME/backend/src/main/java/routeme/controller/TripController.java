package routeme.controller;

import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import routeme.dto.TripCreateRequest;
import routeme.dto.TripDetailResponse;
import routeme.dto.TripQuery;
import routeme.dto.TripSummaryResponse;
import routeme.model.DemoUser;
import routeme.model.TripPlan;
import routeme.service.DemoUserService;
import routeme.service.TripPlanService;

@RestController
@RequestMapping("/api/trips")
public class TripController {

    private final DemoUserService demoUserService;
    private final TripPlanService tripPlanService;

    public TripController(DemoUserService demoUserService, TripPlanService tripPlanService) {
        this.demoUserService = demoUserService;
        this.tripPlanService = tripPlanService;
    }

    @GetMapping
    public List<TripSummaryResponse> list(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String destination,
            @RequestParam(name = "date_from", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(name = "date_to", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String tags,
            @RequestParam(required = false) String sort) {
        demoUserService.require(userId);
        TripQuery query = new TripQuery(
                q, destination, dateFrom, dateTo, TripQueryParams.parseTags(tags), TripQueryParams.parseSort(sort));
        return tripPlanService.search(query).stream()
                .map(trip -> TripSummaryResponse.from(trip, tripPlanService.publisherOf(trip)))
                .toList();
    }

    @GetMapping("/{tripId}")
    public TripDetailResponse detail(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable long tripId) {
        demoUserService.require(userId);
        TripPlan trip = tripPlanService.require(tripId);
        DemoUser publisher = tripPlanService.publisherOf(trip);
        return TripDetailResponse.from(trip, publisher, List.of(publisher));
    }

    @PostMapping
    public ResponseEntity<TripDetailResponse> create(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestBody TripCreateRequest request) {
        DemoUser publisher = demoUserService.require(userId);
        TripPlan saved = tripPlanService.create(request, publisher.id());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(TripDetailResponse.from(saved, publisher, List.of(publisher)));
    }

        @PostMapping("/{tripId}/complete")
        public TripDetailResponse complete(
                @RequestHeader(value = "X-User-Id", required = false) Long userId,
                @PathVariable long tripId) {
            DemoUser publisher = demoUserService.require(userId);
                        TripPlan completed = tripPlanService.complete(tripId, publisher.id());
                        return TripDetailResponse.from(completed, publisher, List.of(publisher));
                    }
            }