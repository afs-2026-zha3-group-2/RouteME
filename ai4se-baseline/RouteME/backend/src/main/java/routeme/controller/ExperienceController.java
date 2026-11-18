package routeme.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import routeme.response.ExperienceLikeResponse;
import routeme.response.ExperienceLikeSaveResponse;
import routeme.response.ExperienceResponse;
import routeme.response.ExperienceSaveResponse;
import routeme.response.PageResponse;
import routeme.request.ExperienceWriteRequest;
import routeme.pojo.DemoUser;
import routeme.param.PageParam;
import routeme.param.TripQueryParam;
import routeme.service.DemoUserService;
import routeme.service.ExperienceLikeService;
import routeme.service.ExperienceService;

@RestController
@RequestMapping("/api")
public class ExperienceController {

    private final DemoUserService demoUserService;
    private final ExperienceService experienceService;
    private final ExperienceLikeService experienceLikeService;

    public ExperienceController(
            DemoUserService demoUserService,
            ExperienceService experienceService,
            ExperienceLikeService experienceLikeService) {
        this.demoUserService = demoUserService;
        this.experienceService = experienceService;
        this.experienceLikeService = experienceLikeService;
    }

    @GetMapping("/experiences")
    public PageResponse<ExperienceResponse> list(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestParam(name = "destination_code", required = false) String destinationCode,
            @RequestParam(name = "date_from", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(name = "date_to", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String tags,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        demoUserService.require(userId);
        return PageResponse.from(experienceService.listPage(
                destinationCode, dateFrom, dateTo, TripQueryParam.parseTags(tags), PageParam.parse(page, size),
                userId));
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
        return experienceService.listByTrip(tripId, userId);
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

    @PostMapping("/experiences/{experienceId}/likes")
    public ResponseEntity<ExperienceLikeResponse> like(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable long experienceId) {
        DemoUser liker = demoUserService.require(userId);
        ExperienceLikeSaveResponse result = experienceLikeService.like(experienceId, liker.id());
        return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK)
                .body(result.like());
    }

    @DeleteMapping("/experiences/{experienceId}/likes")
    public ResponseEntity<Void> unlike(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable long experienceId) {
        DemoUser liker = demoUserService.require(userId);
        experienceLikeService.unlike(experienceId, liker.id());
        return ResponseEntity.noContent().build();
    }
}