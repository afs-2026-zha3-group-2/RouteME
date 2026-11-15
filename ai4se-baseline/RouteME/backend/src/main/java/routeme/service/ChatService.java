package routeme.service;

import java.time.Clock;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import routeme.request.ChatMessageRequest;
import routeme.response.ChatPartnerResponse;
import routeme.enums.TripStatusEnum;
import routeme.exception.ChatNotAllowedException;
import routeme.exception.ChatReadOnlyException;
import routeme.exception.InvalidInputException;
import routeme.model.ChatMessage;
import routeme.model.TripPlan;
import routeme.repository.ChatMessageRepository;

@Service
public class ChatService {

    private static final int MAX_CONTENT_LENGTH = 500;

    private final ChatMessageRepository chatMessageRepository;
    private final TripPlanService tripPlanService;
    private final ApplicationService applicationService;
    private final DemoUserService demoUserService;
    private final Clock clock;

    public ChatService(
            ChatMessageRepository chatMessageRepository,
            TripPlanService tripPlanService,
            ApplicationService applicationService,
            DemoUserService demoUserService,
            Clock clock) {
        this.chatMessageRepository = chatMessageRepository;
        this.tripPlanService = tripPlanService;
        this.applicationService = applicationService;
        this.demoUserService = demoUserService;
        this.clock = clock;
    }

    public List<ChatMessage> conversation(long tripId, long userId, long withUserId) {
        TripPlan trip = tripPlanService.require(tripId);
        requireMatched(trip, userId, withUserId);
        return chatMessageRepository.findConversation(tripId, userId, withUserId);
    }

    @Transactional
    public ChatMessage send(long tripId, long senderId, ChatMessageRequest request) {
        TripPlan trip = tripPlanService.require(tripId);
        long receiverId = request == null ? 0 : request.receiverId();
        requireMatched(trip, senderId, receiverId);
        if (trip.status() == TripStatusEnum.COMPLETED) {
            throw new ChatReadOnlyException(tripId);
        }
        String content = normalizeContent(request == null ? null : request.content());
        ChatMessage message = new ChatMessage(
                chatMessageRepository.nextId(), tripId, senderId, receiverId, content, clock.instant());
        chatMessageRepository.insert(message);
        return message;
    }

    public List<ChatPartnerResponse> partners(long userId) {
        return chatMessageRepository.findThreads(userId).stream()
                .map(thread -> {
                    TripPlan trip = tripPlanService.require(thread.tripId());
                    return ChatPartnerResponse.from(
                            thread,
                            trip,
                            tripPlanService.publisherOf(trip),
                            demoUserService.require(thread.otherUserId()));
                })
                .toList();
    }

    private void requireMatched(TripPlan trip, long userId, long withUserId) {
        if (userId != withUserId) {
            boolean userIsPublisher = trip.publisherId() == userId;
            boolean partnerIsPublisher = trip.publisherId() == withUserId;
            if (userIsPublisher && applicationService.isAccepted(trip.id(), withUserId)) {
                return;
            }
            if (partnerIsPublisher && applicationService.isAccepted(trip.id(), userId)) {
                return;
            }
        }
        throw new ChatNotAllowedException(trip.id(), userId);
    }

    private String normalizeContent(String content) {
        String trimmed = content == null ? "" : content.trim();
        if (trimmed.isEmpty()) {
            throw new InvalidInputException("chat content is required");
        }
        if (trimmed.length() > MAX_CONTENT_LENGTH) {
            throw new InvalidInputException("chat content exceeds " + MAX_CONTENT_LENGTH + " characters");
        }
        return trimmed;
    }
}