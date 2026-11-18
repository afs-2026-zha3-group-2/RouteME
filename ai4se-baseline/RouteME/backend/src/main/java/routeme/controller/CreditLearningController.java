package routeme.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import routeme.exception.DemoUserRequiredException;
import routeme.exception.UserNotFoundException;
import routeme.request.LearningSubmissionRequest;
import routeme.response.LearningResultResponse;
import routeme.response.LearningSessionResponse;
import routeme.service.CreditLearningService;
import routeme.service.DemoUserService;

/**
 * 安全学习恢复信用分端点：身份只取 {@code X-User-Id}，请求体里的用户标识一律忽略。
 */
@RestController
@RequestMapping("/api/credit/learning/sessions")
public class CreditLearningController {

    private final CreditLearningService creditLearningService;
    private final DemoUserService demoUserService;

    public CreditLearningController(
            CreditLearningService creditLearningService,
            DemoUserService demoUserService) {
        this.creditLearningService = creditLearningService;
        this.demoUserService = demoUserService;
    }

    @PostMapping
    public ResponseEntity<LearningSessionResponse> start(
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(creditLearningService.start(requireExistingCaller(userId)));
    }

    @PostMapping("/{sessionId}/lessons/complete")
    public LearningSessionResponse completeLessons(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable long sessionId) {
        return creditLearningService.completeLessons(requireExistingCaller(userId), sessionId);
    }

    @PostMapping("/{sessionId}/submission")
    public LearningResultResponse submit(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable long sessionId,
            @RequestBody(required = false) LearningSubmissionRequest request) {
        List<Integer> answers = request == null ? null : request.answers();
        return creditLearningService.submit(requireExistingCaller(userId), sessionId, answers);
    }

    /**
     * 身份解析：缺请求头沿用 401 {@code DEMO_USER_REQUIRED}；未知 id 按本变更 R7 返回
     * 404 {@code USER_NOT_FOUND}（其余端点仍是「未知 id → 401」，此处按规格显式区分）。
     */
    private long requireExistingCaller(Long userId) {
        if (userId == null) {
            throw new DemoUserRequiredException("missing X-User-Id header");
        }
        if (demoUserService.getById(userId) == null) {
            throw new UserNotFoundException(userId);
        }
        return userId;
    }
}
