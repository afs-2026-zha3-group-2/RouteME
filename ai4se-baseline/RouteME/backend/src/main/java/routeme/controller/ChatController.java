package routeme.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

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

import routeme.request.ChatMessageRequest;
import routeme.request.GroupMessageRequest;
import routeme.response.ChatMessageResponse;
import routeme.response.ChatPartnerResponse;
import routeme.response.GroupChatSummaryResponse;
import routeme.response.GroupMessageResponse;
import routeme.pojo.ChatMessage;
import routeme.pojo.DemoUser;
import routeme.pojo.GroupMessage;
import routeme.service.ChatService;
import routeme.service.DemoUserService;
import routeme.service.GroupChatService;

@RestController
@RequestMapping("/api")
public class ChatController {

    private final DemoUserService demoUserService;
    private final ChatService chatService;
    private final GroupChatService groupChatService;

    public ChatController(
            DemoUserService demoUserService, ChatService chatService, GroupChatService groupChatService) {
        this.demoUserService = demoUserService;
        this.chatService = chatService;
        this.groupChatService = groupChatService;
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

    @GetMapping("/trips/{tripId}/group-messages")
    public List<GroupMessageResponse> groupConversation(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable long tripId) {
        DemoUser reader = demoUserService.require(userId);
        Map<Long, DemoUser> senders = new HashMap<>();
        return groupChatService.messages(tripId, reader.id()).stream()
                .map(message -> GroupMessageResponse.from(
                        message, senders.computeIfAbsent(message.senderId(), demoUserService::require)))
                .toList();
    }

    @PostMapping("/trips/{tripId}/group-messages")
    public ResponseEntity<GroupMessageResponse> sendGroup(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable long tripId,
            @RequestBody GroupMessageRequest request) {
        DemoUser sender = demoUserService.require(userId);
        GroupMessage saved = groupChatService.send(tripId, sender.id(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(GroupMessageResponse.from(saved, sender));
    }

    @GetMapping("/me/group-chats")
    public List<GroupChatSummaryResponse> groups(
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        DemoUser reader = demoUserService.require(userId);
        return groupChatService.myGroups(reader.id());
    }
}