package routeme.controller;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import routeme.dto.TripCreateRequest;
import routeme.dto.TripDetailResponse;
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

    @PostMapping
    public ResponseEntity<TripDetailResponse> create(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestBody TripCreateRequest request) {
        DemoUser publisher = demoUserService.require(userId);
        TripPlan saved = tripPlanService.create(request, publisher.id());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(TripDetailResponse.from(saved, publisher, List.of(publisher)));
    }
}