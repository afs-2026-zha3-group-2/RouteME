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
import routeme.dto.ChatMessageRequest;
import routeme.dto.ChatMessageResponse;
import routeme.dto.ChatPartnerResponse;
import routeme.model.ChatMessage;
import routeme.model.DemoUser;
import routeme.service.ChatService;
import routeme.service.DemoUserService;

@RestController
@RequestMapping("/api")
public class ChatController {

    private final DemoUserService demoUserService;
    private final ChatService chatService;

    public ChatController(DemoUserService demoUserService, ChatService chatService) {
        this.demoUserService = demoUserService;
        this.chatService = chatService;
    }

    @GetMapping("/trips/{tripId}/messages")
    public List<ChatMessageResponse> conversation(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable long tripId,
            @RequestParam("with") long withUserId) {
        DemoUser reader = demoUserService.require(userId);
        return chatService.conversation(tripId, reader.id(), withUserId).stream()
                .map(ChatMessageResponse::from)
                .toList();
    }

    @PostMapping("/trips/{tripId}/messages")
    public ResponseEntity<ChatMessageResponse> send(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable long tripId,
            @RequestBody ChatMessageRequest request) {
        DemoUser sender = demoUserService.require(userId);
        ChatMessage saved = chatService.send(tripId, sender.id(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ChatMessageResponse.from(saved));
    }

    @GetMapping("/me/chat-partners")
    public List<ChatPartnerResponse> partners(
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        DemoUser reader = demoUserService.require(userId);
        return chatService.partners(reader.id());
    }
}