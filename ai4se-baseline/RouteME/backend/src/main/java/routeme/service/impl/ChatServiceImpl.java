package routeme.service.impl;

import java.time.Clock;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import routeme.enums.TripStatusEnum;
import routeme.exception.ChatNotAllowedException;
import routeme.exception.ChatReadOnlyException;
import routeme.exception.InvalidInputException;
import routeme.mapper.ChatMessageMapper;
import routeme.pojo.ChatMessage;
import routeme.entity.ChatMessageEntity;
import routeme.pojo.ChatThread;
import routeme.entity.ChatThreadEntity;
import routeme.pojo.TripPlan;
import routeme.request.ChatMessageRequest;
import routeme.response.ChatPartnerResponse;
import routeme.service.ApplicationService;
import routeme.service.ChatService;
import routeme.service.DemoUserService;
import routeme.service.TripPlanService;

/**
 * 同行聊天的业务实现：会话读写与「已匹配」权限判定。
 * 方法契约以 {@link routeme.service.ChatService} 为准。
 */
@Service
public class ChatServiceImpl extends AbstractServiceImpl<ChatMessageMapper, ChatMessageEntity>
        implements ChatService {

    private static final int MAX_CONTENT_LENGTH = 500;

    private final TripPlanService tripPlanService;
    private final ApplicationService applicationService;
    private final DemoUserService demoUserService;
    private final Clock clock;

    public ChatServiceImpl(
            TripPlanService tripPlanService,
            ApplicationService applicationService,
            DemoUserService demoUserService,
            Clock clock) {
        this.tripPlanService = tripPlanService;
        this.applicationService = applicationService;
        this.demoUserService = demoUserService;
        this.clock = clock;
    }

    @Override
    public List<ChatMessage> conversation(long tripId, long userId, long withUserId) {
        TripPlan trip = tripPlanService.requireCurrent(tripId);
        requireMatched(trip, userId, withUserId);
        return messages(tripId, userId, withUserId);
    }

    /**
     * 读取会话消息，不做权限判断。
     *
     * <p>仅供已通过权限校验的调用方使用：{@link #conversation} 先校验再调用；
     * {@link #partners} 的消息来自历史会话（用户可能已退出该行程），必须按历史记录返回，
     * 因此不能复用带权限判断的 {@code conversation}。</p>
     *
     * @param tripId     行程 id
     * @param userId     当前身份 id
     * @param withUserId 对话另一方 id
     * @return 按发送时间升序的消息列表
     */
    private List<ChatMessage> messages(long tripId, long userId, long withUserId) {
        return list(Wrappers.<ChatMessageEntity>lambdaQuery()
                .eq(ChatMessageEntity::getTripId, tripId)
                .and(wrapper -> wrapper
                        .nested(inner -> inner
                                .eq(ChatMessageEntity::getSenderId, userId)
                                .eq(ChatMessageEntity::getReceiverId, withUserId))
                        .or()
                        .nested(inner -> inner
                                .eq(ChatMessageEntity::getSenderId, withUserId)
                                .eq(ChatMessageEntity::getReceiverId, userId)))
                .orderByAsc(ChatMessageEntity::getSentAt)
                .orderByAsc(ChatMessageEntity::getId)).stream()
                .map(ChatMessageEntity::toChatMessage)
                .toList();
    }

    @Override
    @Transactional
    public ChatMessage send(long tripId, long senderId, ChatMessageRequest request) {
        TripPlan trip = tripPlanService.requireCurrent(tripId);
        long receiverId = request == null ? 0 : request.receiverId();
        requireMatched(trip, senderId, receiverId);
        if (trip.status(clock.instant()) == TripStatusEnum.COMPLETED) {
            throw new ChatReadOnlyException(tripId);
        }
        ChatMessage message = new ChatMessage(
                nextId(ChatMessageEntity::getId),
                tripId,
                senderId,
                receiverId,
                normalizeContent(request == null ? null : request.content()),
                clock.instant());
        save(ChatMessageEntity.from(message));
        return message;
    }

    @Override
    public List<ChatPartnerResponse> partners(long userId) {
        List<ChatThreadEntity> threads = baseMapper.selectThreads(userId);
        return threads.stream()
                .map(row -> {
                    ChatThread thread = new ChatThread(
                            row.getTripId(),
                            row.getOtherId(),
                            lastMessage(row.getTripId(), userId, row.getOtherId()),
                            row.getMessageCount());
                    TripPlan trip = tripPlanService.requireCurrent(thread.tripId());
                    return ChatPartnerResponse.from(
                            thread,
                            trip,
                            tripPlanService.publisherOf(trip),
                            demoUserService.require(thread.otherUserId()),
                            clock.instant());
                })
                .toList();
    }

    private ChatMessage lastMessage(long tripId, long firstUserId, long secondUserId) {
        List<ChatMessage> conversation = messages(tripId, firstUserId, secondUserId);
        return conversation.isEmpty() ? null : conversation.getLast();
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
            throw new InvalidInputException("chat content must be at most " + MAX_CONTENT_LENGTH + " chars");
        }
        return trimmed;
    }
}