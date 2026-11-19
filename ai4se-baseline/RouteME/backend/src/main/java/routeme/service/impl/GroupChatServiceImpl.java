package routeme.service.impl;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import routeme.entity.TripGroupMessageEntity;
import routeme.entity.TripPlanEntity;
import routeme.enums.TripStatusEnum;
import routeme.enums.WriteScopeEnum;
import routeme.exception.ChatLeftException;
import routeme.exception.ChatNotAllowedException;
import routeme.exception.ChatReadOnlyException;
import routeme.exception.InvalidInputException;
import routeme.exception.TripNotFoundException;
import routeme.mapper.TripGroupMessageMapper;
import routeme.pojo.DemoUser;
import routeme.pojo.GroupMessage;
import routeme.pojo.TripApplication;
import routeme.pojo.TripPlan;
import routeme.request.GroupMessageRequest;
import routeme.response.GroupChatSummaryResponse;
import routeme.service.AccountStatusService;
import routeme.service.ApplicationService;
import routeme.service.CreditRestrictionGuard;
import routeme.service.DemoUserService;
import routeme.service.GroupChatService;
import routeme.service.NotificationService;
import routeme.service.StudentVerificationService;
import routeme.service.TripFullEvent;
import routeme.service.TripPlanService;
import routeme.service.TripRouteUpdatedEvent;

/**
 * 行程群聊的业务实现：满员自动建群、成员读写与路线变更同步。
 * 群开设 = 当前满员或已有群消息；成员 = 发布者 + 当前已接受同行者。
 * 方法契约以 {@link routeme.service.GroupChatService} 为准。
 */
@Service
public class GroupChatServiceImpl
        extends AbstractServiceImpl<TripGroupMessageMapper, TripGroupMessageEntity>
        implements GroupChatService {

    private static final int MAX_CONTENT_LENGTH = 500;

    /** 满员建群时以发布者身份落的欢迎消息，保证群在有人退出后仍保留。 */
    public static final String WELCOME_CONTENT = "人齐了，群聊已开通，路线和集合细节在这里商量。";

    private final TripPlanService tripPlanService;
    private final ApplicationService applicationService;
    private final DemoUserService demoUserService;
    private final NotificationService notificationService;
    private final AccountStatusService accountStatusService;
    private final StudentVerificationService studentVerificationService;
    private final CreditRestrictionGuard creditRestrictionGuard;
    private final Clock clock;

    public GroupChatServiceImpl(
            TripPlanService tripPlanService,
            ApplicationService applicationService,
            DemoUserService demoUserService,
            NotificationService notificationService,
            AccountStatusService accountStatusService,
            StudentVerificationService studentVerificationService,
            CreditRestrictionGuard creditRestrictionGuard,
            Clock clock) {
        this.tripPlanService = tripPlanService;
        this.applicationService = applicationService;
        this.demoUserService = demoUserService;
        this.notificationService = notificationService;
        this.accountStatusService = accountStatusService;
        this.studentVerificationService = studentVerificationService;
        this.creditRestrictionGuard = creditRestrictionGuard;
        this.clock = clock;
    }

    @Override
    public boolean isOpen(long tripId) {
        TripPlan trip = tripPlanService.require(tripId);
        return trip.status(clock.instant()) == TripStatusEnum.FULL || messageCount(tripId) > 0;
    }

    @Override
    public List<GroupMessage> messages(long tripId, long userId) {
        TripPlan trip = tripPlanService.requireCurrent(tripId);
        requireOpen(trip);
        // 退出行程后仍可回看历史，只是不能再发送。
        if (!isMember(trip, userId) && !isFormerMember(trip, userId)) {
            throw new ChatNotAllowedException(tripId, userId);
        }
        return listByTrip(tripId);
    }

    @Override
    @Transactional
    public GroupMessage send(long tripId, long senderId, GroupMessageRequest request) {
        accountStatusService.assertCanWrite(senderId, WriteScopeEnum.BUSINESS);
        studentVerificationService.requireVerified(senderId);
        TripPlan trip = tripPlanService.requireCurrent(tripId);
        requireOpen(trip);
        if (!isMember(trip, senderId)) {
            if (isFormerMember(trip, senderId)) {
                throw new ChatLeftException(tripId, senderId);
            }
            throw new ChatNotAllowedException(tripId, senderId);
        }
        creditRestrictionGuard.requireNotRestricted(senderId);
        if (trip.status(clock.instant()) == TripStatusEnum.COMPLETED
                || trip.status(clock.instant()) == TripStatusEnum.CANCELLED) {
            throw new ChatReadOnlyException(tripId);
        }
        GroupMessage message = new GroupMessage(
                nextId(TripGroupMessageEntity::getId),
                tripId,
                senderId,
                normalizeContent(request == null ? null : request.content()),
                clock.instant());
        save(TripGroupMessageEntity.from(message));
        for (DemoUser participant : applicationService.participants(tripId)) {
            notificationService.notifyGroupMessage(participant.id(), senderId, message);
        }
        return message;
    }

    @Override
    public List<GroupChatSummaryResponse> myGroups(long userId) {
        Set<Long> tripIds = new LinkedHashSet<>();
        for (TripPlanEntity row : tripPlanService.lambdaQuery()
                .eq(TripPlanEntity::getPublisherId, userId)
                .list()) {
            tripIds.add(row.getId());
        }
        // 当前同行者与已退出的同行者都保留群入口：后者只能回看历史。
        for (TripApplication application : applicationService.mine(userId)) {
            if (application.isAccepted() || application.isLeft()) {
                tripIds.add(application.tripId());
            }
        }
        List<GroupChatSummaryResponse> groups = new ArrayList<>();
        for (Long tripId : tripIds) {
            TripPlan trip = tripPlanService.requireCurrent(tripId);
            if (trip.status(clock.instant()) != TripStatusEnum.FULL && messageCount(tripId) == 0) {
                continue;
            }
            List<GroupMessage> messages = listByTrip(tripId);
            GroupMessage last = messages.isEmpty() ? null : messages.getLast();
            groups.add(GroupChatSummaryResponse.from(
                    trip,
                    tripPlanService.publisherOf(trip),
                    applicationService.participants(tripId).size(),
                    last,
                    last == null ? null : demoUserService.require(last.senderId()),
                    messages.size(),
                    isFormerMember(trip, userId),
                    clock.instant()));
        }
        groups.sort(Comparator
                .comparing((GroupChatSummaryResponse group) -> group.lastMessage() == null)
                .thenComparing(
                        group -> group.lastMessage() == null
                                ? Instant.EPOCH
                                : group.lastMessage().sentAt(),
                        Comparator.reverseOrder())
                .thenComparing(group -> group.trip().id(), Comparator.reverseOrder()));
        return groups;
    }

    /** 满员成行：落欢迎消息并通知参与者；已有群消息时幂等跳过。 */
    @EventListener
    @Transactional
    public void onTripFull(TripFullEvent event) {
        if (messageCount(event.tripId()) > 0) {
            return;
        }
        GroupMessage welcome = new GroupMessage(
                nextId(TripGroupMessageEntity::getId),
                event.tripId(),
                event.publisherId(),
                WELCOME_CONTENT,
                event.fullAt());
        save(TripGroupMessageEntity.from(welcome));
        for (DemoUser participant : applicationService.participants(event.tripId())) {
            notificationService.notifyTripGroupOpened(participant.id(), event.publisherId(), event.tripId());
        }
    }

    /** 路线变更：群已开时以发布者身份同步一条变更消息；通知由路线事件另行覆盖。 */
    @EventListener
    @Transactional
    public void onTripRouteUpdated(TripRouteUpdatedEvent event) {
        if (!isOpen(event.tripId())) {
            return;
        }
        GroupMessage message = new GroupMessage(
                nextId(TripGroupMessageEntity::getId),
                event.tripId(),
                event.publisherId(),
                "路线已更新：" + String.join(" → ", event.stops()),
                event.updatedAt());
        save(TripGroupMessageEntity.from(message));
    }

    private List<GroupMessage> listByTrip(long tripId) {
        return list(Wrappers.<TripGroupMessageEntity>lambdaQuery()
                .eq(TripGroupMessageEntity::getTripId, tripId)
                .orderByAsc(TripGroupMessageEntity::getSentAt)
                .orderByAsc(TripGroupMessageEntity::getId)).stream()
                .map(TripGroupMessageEntity::toGroupMessage)
                .toList();
    }

    private int messageCount(long tripId) {
        return (int) count(Wrappers.<TripGroupMessageEntity>lambdaQuery()
                .eq(TripGroupMessageEntity::getTripId, tripId));
    }

    private void requireOpen(TripPlan trip) {
        if (trip.status(clock.instant()) != TripStatusEnum.FULL && messageCount(trip.id()) == 0) {
            throw new TripNotFoundException(trip.id());
        }
    }

    private void requireMember(TripPlan trip, long userId) {
        if (isMember(trip, userId)) {
            return;
        }
        throw new ChatNotAllowedException(trip.id(), userId);
    }

    /** 当前群成员：发布者或已接受同行者。 */
    private boolean isMember(TripPlan trip, long userId) {
        return trip.publisherId() == userId || applicationService.isAccepted(trip.id(), userId);
    }

    /** 曾加入后退出：历史可读，但不能再发送。 */
    private boolean isFormerMember(TripPlan trip, long userId) {
        return trip.publisherId() != userId && applicationService.hasLeft(trip.id(), userId);
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