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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import routeme.response.ExperienceResponse;
import routeme.response.ExperienceSaveResponse;
import routeme.response.PageResponse;
import routeme.request.ExperienceWriteRequest;
import routeme.model.DemoUser;
import routeme.param.PageParam;
import routeme.param.TripQueryParam;
import routeme.service.DemoUserService;
import routeme.service.ExperienceService;

@RestController
@RequestMapping("/api")
public class ExperienceController {

    private final DemoUserService demoUserService;
    private final ExperienceService experienceService;

    public ExperienceController(DemoUserService demoUserService, ExperienceService experienceService) {
        this.demoUserService = demoUserService;
        this.experienceService = experienceService;
    }

    @GetMapping("/experiences")
    public PageResponse<ExperienceResponse> list(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String destination,
            @RequestParam(required = false) String tags,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        demoUserService.require(userId);
        return PageResponse.from(experienceService.listPage(
                q, destination, TripQueryParam.parseTags(tags), PageParam.parse(page, size)));
    }

    @GetMapping("/me/experiences")
    public List<ExperienceResponse> mine(
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        DemoUser author = demoUserService.require(userId);
        return experienceService.mine(author.id());
    }

    @GetMapping("/trips/{tripId}/experiences")
    public List<ExperienceResponse> byTrip(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable long tripId) {
        demoUserService.require(userId);
        return experienceService.listByTrip(tripId);
    }

    @PostMapping("/trips/{tripId}/experiences")
    public ResponseEntity<ExperienceResponse> share(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable long tripId,
            @RequestBody ExperienceWriteRequest request) {
        DemoUser author = demoUserService.require(userId);
        ExperienceSaveResponse result = experienceService.upsert(tripId, author.id(), request);
        return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK)
                .body(result.experience());
    }
}