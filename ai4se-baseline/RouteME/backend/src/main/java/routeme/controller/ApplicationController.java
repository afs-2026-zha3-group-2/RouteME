package routeme.controller;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import routeme.dto.ApplicationCreateRequest;
import routeme.dto.TripApplicationResponse;
import routeme.model.DemoUser;
import routeme.model.TripApplication;
import routeme.service.ApplicationService;
import routeme.service.DemoUserService;

@RestController
@RequestMapping("/api")
public class ApplicationController {

    private final DemoUserService demoUserService;
    private final ApplicationService applicationService;

    public ApplicationController(DemoUserService demoUserService, ApplicationService applicationService) {
        this.demoUserService = demoUserService;
        this.applicationService = applicationService;
    }

    @PostMapping("/trips/{tripId}/applications")
    public ResponseEntity<TripApplicationResponse> apply(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable long tripId,
            @RequestBody(required = false) ApplicationCreateRequest request) {
        DemoUser applicant = demoUserService.require(userId);
        TripApplication created = applicationService.apply(tripId, applicant.id(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(applicationService.describe(created));
    }

    @GetMapping("/trips/{tripId}/applications")
        public List<TripApplicationResponse> listForPublisher(
                @RequestHeader(value = "X-User-Id", required = false) Long userId,
                @PathVariable long tripId) {
            DemoUser publisher = demoUserService.require(userId);
            return applicationService.listForPublisher(tripId, publisher.id()).stream()
                    .map(applicationService::describe)
                    .toList();
        }

        @GetMapping("/me/applications")
        public List<TripApplicationResponse> mine(
                @RequestHeader(value = "X-User-Id", required = false) Long userId) {
            DemoUser applicant = demoUserService.require(userId);
            return applicationService.mine(applicant.id()).stream()
                    .map(applicationService::describe)
                    .toList();
        }

        @PostMapping("/applications/{applicationId}/cancel")
    public TripApplicationResponse cancel(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable long applicationId) {
        DemoUser applicant = demoUserService.require(userId);
        TripApplication cancelled = applicationService.cancel(applicationId, applicant.id());
        return applicationService.describe(cancelled);
    }

            @PostMapping("/applications/{applicationId}/accept")
            public TripApplicationResponse accept(
                    @RequestHeader(value = "X-User-Id", required = false) Long userId,
                    @PathVariable long applicationId) {
                DemoUser publisher = demoUserService.require(userId);
                TripApplication accepted = applicationService.accept(applicationId, publisher.id());
                return applicationService.describe(accepted);
            }

            @PostMapping("/applications/{applicationId}/reject")
            public TripApplicationResponse reject(
                    @RequestHeader(value = "X-User-Id", required = false) Long userId,
                    @PathVariable long applicationId) {
                DemoUser publisher = demoUserService.require(userId);
                TripApplication rejected = applicationService.reject(applicationId, publisher.id());
                return applicationService.describe(rejected);
            }

            @PostMapping("/trips/{tripId}/leave")
            public ResponseEntity<Void> leave(
                    @RequestHeader(value = "X-User-Id", required = false) Long userId,
                    @PathVariable long tripId) {
                DemoUser companion = demoUserService.require(userId);
                applicationService.leave(tripId, companion.id());
                return ResponseEntity.noContent().build();
            }
        }