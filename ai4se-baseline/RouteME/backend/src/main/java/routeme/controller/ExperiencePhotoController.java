package routeme.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import routeme.pojo.DemoUser;
import routeme.response.ExperiencePhotoResponse;
import routeme.service.DemoUserService;
import routeme.service.ExperiencePhotoService;

@RestController
@RequestMapping("/api")
public class ExperiencePhotoController {

    private static final String PHOTO_CACHE_CONTROL = "public, max-age=86400";

    private final DemoUserService demoUserService;
    private final ExperiencePhotoService experiencePhotoService;

    public ExperiencePhotoController(
            DemoUserService demoUserService, ExperiencePhotoService experiencePhotoService) {
        this.demoUserService = demoUserService;
        this.experiencePhotoService = experiencePhotoService;
    }

    @PostMapping("/trips/{tripId}/experiences/photos")
    public ExperiencePhotoResponse upload(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable long tripId,
            @RequestParam("file") MultipartFile file) {
        DemoUser author = demoUserService.require(userId);
        return experiencePhotoService.upload(tripId, author.id(), file);
    }

    @GetMapping("/experience-photos/{photoId}")
    public ResponseEntity<byte[]> photo(@PathVariable long photoId) {
        return experiencePhotoService.load(photoId)
                .map(photo -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(photo.mime()))
                        .header(HttpHeaders.CACHE_CONTROL, PHOTO_CACHE_CONTROL)
                        .body(photo.bytes()))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
