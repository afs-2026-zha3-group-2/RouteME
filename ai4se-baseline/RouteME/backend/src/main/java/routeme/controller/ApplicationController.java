package routeme.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import routeme.enums.CreditExitReasonEnum;
import routeme.request.ApplicationCreateRequest;
import routeme.request.LeaveRequest;
import routeme.response.LeaveEvidenceResponse;
import routeme.response.LeavePreviewResponse;
import routeme.response.LeaveRecordResponse;
import routeme.response.LeaveResultResponse;
import routeme.response.TripApplicationResponse;
import routeme.pojo.CreditExitPreview;
import routeme.pojo.CreditExitResult;
import routeme.pojo.DemoUser;
import routeme.pojo.LeaveEvidenceFile;
import routeme.pojo.TripApplication;
import routeme.service.ApplicationService;
import routeme.service.CreditEnforcementService;
import routeme.service.DemoUserService;

@RestController
@RequestMapping("/api")
public class ApplicationController {

    private final DemoUserService demoUserService;
    private final ApplicationService applicationService;
    private final CreditEnforcementService creditEnforcementService;

    public ApplicationController(
            DemoUserService demoUserService,
            ApplicationService applicationService,
            CreditEnforcementService creditEnforcementService) {
        this.demoUserService = demoUserService;
        this.applicationService = applicationService;
        this.creditEnforcementService = creditEnforcementService;
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

            @GetMapping("/trips/{tripId}/leave-preview")
            public LeavePreviewResponse previewLeave(
                    @RequestHeader(value = "X-User-Id", required = false) Long userId,
                    @PathVariable long tripId,
                    @RequestParam(value = "reason", required = false) String reason) {
                DemoUser companion = demoUserService.require(userId);
                CreditExitPreview preview = creditEnforcementService.previewExit(
                        tripId, companion.id(), CreditExitReasonEnum.parse(reason));
                return LeavePreviewResponse.from(preview);
            }

            @PostMapping("/trips/{tripId}/leave")
            public ResponseEntity<LeaveResultResponse> leave(
                    @RequestHeader(value = "X-User-Id", required = false) Long userId,
                    @PathVariable long tripId,
                    @RequestBody(required = false) LeaveRequest request) {
                DemoUser companion = demoUserService.require(userId);
                CreditExitResult result = creditEnforcementService.leave(
                        tripId,
                        companion.id(),
                        CreditExitReasonEnum.parse(request == null ? null : request.reason()),
                        request == null ? null : request.note(),
                        request == null ? null : request.attachmentIds());
                return ResponseEntity.ok(LeaveResultResponse.from(result));
            }

            @PostMapping("/trips/{tripId}/leave-evidence")
            public ResponseEntity<LeaveEvidenceResponse> uploadLeaveEvidence(
                    @RequestHeader(value = "X-User-Id", required = false) Long userId,
                    @PathVariable long tripId,
                    @RequestPart(value = "file", required = false) MultipartFile file) {
                DemoUser companion = demoUserService.require(userId);
                LeaveEvidenceResponse response = creditEnforcementService.uploadEvidence(
                        tripId, companion.id(), file);
                return ResponseEntity.status(HttpStatus.CREATED).body(response);
            }

            @GetMapping("/trips/{tripId}/leave-record")
            public List<LeaveRecordResponse> leaveRecords(
                    @RequestHeader(value = "X-User-Id", required = false) Long userId,
                    @PathVariable long tripId) {
                DemoUser companion = demoUserService.require(userId);
                return creditEnforcementService.leaveRecords(tripId, companion.id());
            }

            @GetMapping("/leave-evidence/{attachmentId}")
            public ResponseEntity<byte[]> leaveEvidence(
                    @RequestHeader(value = "X-User-Id", required = false) Long userId,
                    @PathVariable long attachmentId) {
                DemoUser viewer = demoUserService.require(userId);
                LeaveEvidenceFile file = creditEnforcementService.loadEvidence(attachmentId, viewer.id());
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(file.contentType()))
                        .body(file.content());
            }
        }