package routeme.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import routeme.pojo.AiGenerateResponse;
import routeme.pojo.AiItinerarySaved;
import routeme.pojo.DemoUser;
import routeme.request.AiGenerateRequest;
import routeme.service.AiItineraryService;
import routeme.service.DemoUserService;

/**
 * AI 行程端点：生成（天气自取注入 + DeepSeek 推荐）与快照整存整取。
 * 快照归属当前用户；不存在或非本人一律 400 INVALID_INPUT（与发布链接同口径）。
 */
@RestController
@RequestMapping("/api/ai/itineraries")
public class AiItineraryController {

    private final AiItineraryService aiItineraryService;
    private final DemoUserService demoUserService;

    public AiItineraryController(AiItineraryService aiItineraryService, DemoUserService demoUserService) {
        this.aiItineraryService = aiItineraryService;
        this.demoUserService = demoUserService;
    }

    @PostMapping("/generate")
    public AiGenerateResponse generate(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestBody AiGenerateRequest request) {
        demoUserService.require(userId);
        return aiItineraryService.generate(request);
    }

    @PostMapping
    public ResponseEntity<AiItinerarySaved> save(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestBody String snapshotJson) {
        DemoUser user = demoUserService.require(userId);
        AiItinerarySaved saved = aiItineraryService.saveSnapshot(snapshotJson, user.id());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping("/{id}")
    public ResponseEntity<String> read(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable long id) {
        DemoUser user = demoUserService.require(userId);
        String snapshot = aiItineraryService.requireOwnedSnapshot(id, user.id());
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(snapshot);
    }
}