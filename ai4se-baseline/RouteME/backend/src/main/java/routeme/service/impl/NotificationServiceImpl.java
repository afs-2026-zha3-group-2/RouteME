package routeme.service.impl;

import java.time.Instant;
import java.util.List;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

import lombok.extern.slf4j.Slf4j;

import routeme.entity.NotificationEntity;
import routeme.enums.NotificationTypeEnum;
import routeme.exception.NotificationNotFoundException;
import routeme.mapper.NotificationMapper;
import routeme.pojo.ChatMessage;
import routeme.pojo.DemoUser;
import routeme.pojo.Notification;
import routeme.pojo.TripPlan;
import routeme.response.ChatMessageResponse;
import routeme.response.NotificationCountsResponse;
import routeme.response.NotificationEventResponse;
import routeme.response.NotificationListResponse;
import routeme.response.NotificationResponse;
import routeme.service.DemoUserService;
import routeme.service.NotificationService;
import routeme.service.NotificationStreamService;
import routeme.service.TripPlanService;

/**
 * 通知实现：写入一行 → 事务提交后推送 → 列表 / 计数 / 标读读同一份行数据。
 *
 * <p>未读 = {@code read_at IS NULL}；不建独立计数表，类型拆分由 {@code type} 派生。</p>
 */
@Slf4j
@Service
public class NotificationServiceImpl
        extends AbstractServiceImpl<NotificationMapper, NotificationEntity>
        implements NotificationService {

    private static final int MAX_LIST_SIZE = 50;

    private static final List<String> APPLICATION_TYPES = List.of(
            NotificationTypeEnum.APPLICATION_RECEIVED.wireValue(),
            NotificationTypeEnum.APPLICATION_ACCEPTED.wireValue(),
            NotificationTypeEnum.APPLICATION_REJECTED.wireValue());

    private final DemoUserService demoUserService;
    private final TripPlanService tripPlanService;
    private final ObjectProvider<NotificationStreamService> streamServiceProvider;
    private final java.time.Clock clock;

    public NotificationServiceImpl(
            DemoUserService demoUserService,
            TripPlanService tripPlanService,
            ObjectProvider<NotificationStreamService> streamServiceProvider,
            java.time.Clock clock) {
        this.demoUserService = demoUserService;
        this.tripPlanService = tripPlanService;
        this.streamServiceProvider = streamServiceProvider;
        this.clock = clock;
    }

    @Override
    public void notifyApplicationReceived(
            long recipientId, long actorId, long tripId, long applicationId) {
        try {
            write(
                    recipientId,
                    NotificationTypeEnum.APPLICATION_RECEIVED,
                    actorId,
                    tripId,
                    applicationId,
                    null,
                    null);
        } catch (RuntimeException exception) {
            log.warn(
                    "notification skipped: type={}, recipient={}, trip={}",
                    NotificationTypeEnum.APPLICATION_RECEIVED.wireValue(), recipientId, tripId, exception);
        }
    }

    @Override
    public void notifyApplicationAccepted(
            long recipientId, long actorId, long tripId, long applicationId) {
        try {
            write(
                    recipientId,
                    NotificationTypeEnum.APPLICATION_ACCEPTED,
                    actorId,
                    tripId,
                    applicationId,
                    null,
                    null);
        } catch (RuntimeException exception) {
            log.warn(
                    "notification skipped: type={}, recipient={}, trip={}",
                    NotificationTypeEnum.APPLICATION_ACCEPTED.wireValue(), recipientId, tripId, exception);
        }
    }

    @Override
    public void notifyApplicationRejected(
            long recipientId, long actorId, long tripId, long applicationId) {
        try {
            write(
                    recipientId,
                    NotificationTypeEnum.APPLICATION_REJECTED,
                    actorId,
                    tripId,
                    applicationId,
                    null,
                    null);
        } catch (RuntimeException exception) {
            log.warn(
                    "notification skipped: type={}, recipient={}, trip={}",
                    NotificationTypeEnum.APPLICATION_REJECTED.wireValue(), recipientId, tripId, exception);
        }
    }

    @Override
    public void notifyMessage(long recipientId, long actorId, ChatMessage message) {
        try {
            write(
                    recipientId,
                    NotificationTypeEnum.MESSAGE,
                    actorId,
                    message.tripId(),
                    null,
                    message.id(),
                    message);
        } catch (RuntimeException exception) {
            log.warn(
                    "notification skipped: type={}, recipient={}, trip={}",
                    NotificationTypeEnum.MESSAGE.wireValue(), recipientId, message.tripId(), exception);
        }
    }

    @Override
    public NotificationListResponse list(long recipientId) {
        List<NotificationResponse> items = page(
                        new Page<>(1, MAX_LIST_SIZE, false),
                        Wrappers.<NotificationEntity>lambdaQuery()
                                .eq(NotificationEntity::getRecipientId, recipientId)
                                .orderByDesc(NotificationEntity::getCreatedAt)
                                .orderByDesc(NotificationEntity::getId))
                .getRecords().stream()
                .map(this::describe)
                .toList();
        return new NotificationListResponse(items, counts(recipientId));
    }

    @Override
    public NotificationCountsResponse markRead(long notificationId, long recipientId) {
        NotificationEntity entity = getById(notificationId);
        if (entity == null || entity.getRecipientId() == null || entity.getRecipientId() != recipientId) {
            throw new NotificationNotFoundException(notificationId);
        }
        if (entity.getReadAt() == null) {
            lambdaUpdate()
                    .eq(NotificationEntity::getId, notificationId)
                    .eq(NotificationEntity::getRecipientId, recipientId)
                    .isNull(NotificationEntity::getReadAt)
                    .set(NotificationEntity::getReadAt, clock.instant().toString())
                    .update();
        }
        return counts(recipientId);
    }

    @Override
    public NotificationCountsResponse markAllRead(long recipientId) {
        lambdaUpdate()
                .eq(NotificationEntity::getRecipientId, recipientId)
                .isNull(NotificationEntity::getReadAt)
                .set(NotificationEntity::getReadAt, clock.instant().toString())
                .update();
        return counts(recipientId);
    }

    @Override
    public NotificationCountsResponse markConversationRead(
            long recipientId, long tripId, long otherUserId) {
        lambdaUpdate()
                .eq(NotificationEntity::getRecipientId, recipientId)
                .isNull(NotificationEntity::getReadAt)
                .eq(NotificationEntity::getType, NotificationTypeEnum.MESSAGE.wireValue())
                .eq(NotificationEntity::getTripId, tripId)
                .eq(NotificationEntity::getActorId, otherUserId)
                .set(NotificationEntity::getReadAt, clock.instant().toString())
                .update();
        return counts(recipientId);
    }

    private void write(
            long recipientId,
            NotificationTypeEnum type,
            long actorId,
            long tripId,
            Long applicationId,
            Long messageId,
            ChatMessage message) {
        if (recipientId == actorId) {
            return;
        }
        DemoUser actor = demoUserService.require(actorId);
        TripPlan trip = tripPlanService.require(tripId);
        Instant now = clock.instant();
        Notification notification = new Notification(
                nextId(NotificationEntity::getId),
                recipientId,
                type,
                actorId,
                tripId,
                applicationId,
                messageId,
                now,
                null);
        save(NotificationEntity.from(notification));
        publish(
                recipientId,
                new NotificationEventResponse(
                        NotificationResponse.from(notification, actor, trip),
                        message == null ? null : ChatMessageResponse.from(message)));
    }

    private void publish(long userId, NotificationEventResponse event) {
        NotificationStreamService streamService = streamServiceProvider.getIfAvailable();
        if (streamService == null) {
            return;
        }
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    streamService.publish(userId, event);
                }
            });
            return;
        }
        streamService.publish(userId, event);
    }

    private NotificationCountsResponse counts(long recipientId) {
        long total = lambdaQuery()
                .eq(NotificationEntity::getRecipientId, recipientId)
                .isNull(NotificationEntity::getReadAt)
                .count();
        long application = lambdaQuery()
                .eq(NotificationEntity::getRecipientId, recipientId)
                .isNull(NotificationEntity::getReadAt)
                .in(NotificationEntity::getType, APPLICATION_TYPES)
                .count();
        long message = lambdaQuery()
                .eq(NotificationEntity::getRecipientId, recipientId)
                .isNull(NotificationEntity::getReadAt)
                .eq(NotificationEntity::getType, NotificationTypeEnum.MESSAGE.wireValue())
                .count();
        return new NotificationCountsResponse(total, application, message);
    }

    private NotificationResponse describe(NotificationEntity entity) {
        Notification notification = entity.toNotification();
        DemoUser actor = demoUserService.require(notification.actorId());
        TripPlan trip = tripPlanService.require(notification.tripId());
        return NotificationResponse.from(notification, actor, trip);
    }
}