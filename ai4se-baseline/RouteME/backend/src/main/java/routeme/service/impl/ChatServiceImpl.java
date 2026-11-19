package routeme.service.impl;

import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import routeme.enums.TripStatusEnum;
import routeme.enums.WriteScopeEnum;
import routeme.exception.ChatNotAllowedException;
import routeme.exception.ChatReadOnlyException;
import routeme.exception.InvalidInputException;
import routeme.mapper.ChatMessageMapper;
import routeme.pojo.ChatMessage;
import routeme.entity.ChatMessageEntity;
import routeme.pojo.ChatCounterpart;
import routeme.pojo.ChatThread;
import routeme.entity.ChatThreadEntity;
import routeme.pojo.TripPlan;
import routeme.request.ChatMessageRequest;
import routeme.response.ChatPartnerResponse;
import routeme.service.ApplicationService;
import routeme.service.AccountStatusService;
import routeme.service.ChatService;
import routeme.service.CreditRestrictionGuard;
import routeme.service.DemoUserService;
import routeme.service.NotificationService;
import routeme.service.StudentVerificationService;
import routeme.service.TripPlanService;

/**
 * 同行聊天的业务实现：会话读写与聊天权限判定。
 * 准入 = 发布者本人，或该行程申请状态为 accepted / left。
 * 方法契约以 {@link routeme.service.ChatService} 为准。
 */
@Service
public class ChatServiceImpl extends AbstractServiceImpl<ChatMessageMapper, ChatMessageEntity>
        implements ChatService {

    private static final int MAX_CONTENT_LENGTH = 500;

    /**
     * 会话排序：有消息的在前（按最后一条发送时间倒序），无消息的排末尾；
     * 同序按 tripId / otherUserId 倒序，保证结果稳定。
     */
    private static final Comparator<ChatThread> THREAD_ORDER = Comparator
            .comparing((ChatThread thread) -> thread.lastMessage() == null)
            .thenComparing(
                    thread -> thread.lastMessage() == null ? Instant.EPOCH : thread.lastMessage().sentAt(),
                    Comparator.reverseOrder())
            .thenComparing(ChatThread::tripId, Comparator.reverseOrder())
            .thenComparing(ChatThread::otherUserId, Comparator.reverseOrder());

    private final TripPlanService tripPlanService;
    private final ApplicationService applicationService;
    private final DemoUserService demoUserService;
    private final CreditRestrictionGuard creditRestrictionGuard;
    private final Clock clock;
    private final AccountStatusService accountStatusService;
    private final NotificationService notificationService;
    private final StudentVerificationService studentVerificationService;

    public ChatServiceImpl(
            TripPlanService tripPlanService,
            ApplicationService applicationService,
            DemoUserService demoUserService,
            CreditRestrictionGuard creditRestrictionGuard,
            Clock clock,
            AccountStatusService accountStatusService,
            NotificationService notificationService,
            StudentVerificationService studentVerificationService) {
        this.tripPlanService = tripPlanService;
        this.applicationService = applicationService;
        this.demoUserService = demoUserService;
        this.creditRestrictionGuard = creditRestrictionGuard;
        this.clock = clock;
        this.accountStatusService = accountStatusService;
        this.notificationService = notificationService;
        this.studentVerificationService = studentVerificationService;
    }

    @Override
    public List<ChatMessage> conversation(long tripId, long userId, long withUserId) {
        TripPlan trip = tripPlanService.requireCurrent(tripId);
        requireAccess(trip, userId, withUserId);
        return messages(tripId, userId, withUserId);
    }

    @Override
    public List<ChatMessage> transcript(long tripId, long firstUserId, long secondUserId) {
        return messages(tripId, firstUserId, secondUserId);
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
        accountStatusService.assertCanWrite(senderId, WriteScopeEnum.BUSINESS);
        studentVerificationService.requireVerified(senderId);
        TripPlan trip = tripPlanService.requireCurrent(tripId);
        long receiverId = request == null ? 0 : request.receiverId();
        requireAccess(trip, senderId, receiverId);
        // 信用限制是账号级全局守卫，优先于行程内成员状态：受限账号的写操作统一返回 CREDIT_RESTRICTED
        // （信用受限会同时清退同行关系，若先判 CHAT_LEFT 会掩盖受限根因，也与其它写入口口径不一致）。
        creditRestrictionGuard.requireNotRestricted(senderId);
        // 已退出行程：一对一聊天也只保留历史回看，与群聊同口径。
        if (trip.publisherId() != senderId && applicationService.hasLeft(trip.id(), senderId)) {
            throw new routeme.exception.ChatLeftException(tripId, senderId);
        }
        if (trip.status(clock.instant()) == TripStatusEnum.COMPLETED
                || trip.status(clock.instant()) == TripStatusEnum.CANCELLED) {
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
        notificationService.notifyMessage(receiverId, senderId, message);
        return message;
    }

    @Override
    public List<ChatPartnerResponse> partners(long userId) {
        Map<ChatCounterpart, ChatThread> threads = new LinkedHashMap<>();
        for (ChatCounterpart counterpart : applicationService.chatCounterparts(userId)) {
            threads.putIfAbsent(
                    counterpart,
                    new ChatThread(counterpart.tripId(), counterpart.otherUserId(), null, 0));
        }
        for (ChatThreadEntity row : baseMapper.selectThreads(userId)) {
            ChatCounterpart pair = new ChatCounterpart(row.getTripId(), row.getOtherId());
            threads.put(
                    pair,
                    new ChatThread(
                            pair.tripId(),
                            pair.otherUserId(),
                            lastMessage(pair.tripId(), userId, pair.otherUserId()),
                            row.getMessageCount()));
        }
        return threads.values().stream()
                .sorted(THREAD_ORDER)
                .map(thread -> {
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

    private void requireAccess(TripPlan trip, long userId, long withUserId) {
        if (userId != withUserId) {
            boolean userIsPublisher = trip.publisherId() == userId;
            boolean partnerIsPublisher = trip.publisherId() == withUserId;
            if (userIsPublisher && applicationService.isChatPartner(trip.id(), withUserId)) {
                return;
            }
            if (partnerIsPublisher && applicationService.isChatPartner(trip.id(), userId)) {
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