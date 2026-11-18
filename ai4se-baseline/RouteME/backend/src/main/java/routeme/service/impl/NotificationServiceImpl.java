package routeme.service.impl;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

import lombok.extern.slf4j.Slf4j;

import routeme.entity.CustomerServiceSessionEntity;
import routeme.entity.NotificationEntity;
import routeme.entity.ReportEntity;
import routeme.entity.TripPlanEntity;
import routeme.entity.UserEntity;
import routeme.enums.AccountStatusEnum;
import routeme.enums.NotificationEventEnum;
import routeme.enums.NotificationPriorityEnum;
import routeme.enums.NotificationTargetKindEnum;
import routeme.enums.NotificationTypeEnum;
import routeme.exception.NotificationNotFoundException;
import routeme.mapper.CustomerServiceSessionMapper;
import routeme.mapper.NotificationMapper;
import routeme.mapper.ReportMapper;
import routeme.pojo.ChatMessage;
import routeme.pojo.DemoUser;
import routeme.pojo.Notification;
import routeme.response.ChatMessageResponse;
import routeme.response.NotificationCountsResponse;
import routeme.response.NotificationEventResponse;
import routeme.response.NotificationListResponse;
import routeme.response.NotificationResponse;
import routeme.response.NotificationTargetResponse;
import routeme.service.DemoUserService;
import routeme.service.NotificationService;
import routeme.service.NotificationStreamService;
import routeme.service.TripPlanService;
import routeme.utils.NotificationTextUtils;
import routeme.utils.NotificationTextUtils.Draft;

/**
 * 通知实现：写入一行 → 事务提交后推送 → 列表 / 计数 / 标读读同一份行数据。
 *
 * <p>未读 = {@code read_at IS NULL}；不建独立计数表，类型拆分由 {@code type} 派生。
 * 同一业务事件按 {@code (recipient_id, dedupe_key)} 唯一，先查后插 + 唯一索引兜底。</p>
 */
@Slf4j
@Service
public class NotificationServiceImpl
        extends AbstractServiceImpl<NotificationMapper, NotificationEntity>
        implements NotificationService {

    private static final int MAX_LIST_SIZE = 50;
    private static final int LOW_CREDIT_THRESHOLD = 60;

    private final DemoUserService demoUserService;
    private final TripPlanService tripPlanService;
    private final ReportMapper reportMapper;
    private final CustomerServiceSessionMapper sessionMapper;
    private final ObjectProvider<NotificationStreamService> streamServiceProvider;
    private final java.time.Clock clock;

    public NotificationServiceImpl(
            DemoUserService demoUserService,
            TripPlanService tripPlanService,
            ReportMapper reportMapper,
            CustomerServiceSessionMapper sessionMapper,
            ObjectProvider<NotificationStreamService> streamServiceProvider,
            java.time.Clock clock) {
        this.demoUserService = demoUserService;
        this.tripPlanService = tripPlanService;
        this.reportMapper = reportMapper;
        this.sessionMapper = sessionMapper;
        this.streamServiceProvider = streamServiceProvider;
        this.clock = clock;
    }

    // ---------- 同行申请 ----------

    @Override
    public void notifyApplicationReceived(
            long recipientId, long actorId, long tripId, long applicationId) {
        write(
                recipientId,
                NotificationEventEnum.APPLICATION_RECEIVED,
                NotificationPriorityEnum.NORMAL,
                actorId,
                tripId,
                applicationId,
                null,
                null,
                null,
                "application_received:" + applicationId,
                NotificationTextUtils.applicationReceived(nicknameOf(actorId), titleOf(tripId)),
                null);
    }

    @Override
    public void notifyApplicationAccepted(
            long recipientId, long actorId, long tripId, long applicationId) {
        write(
                recipientId,
                NotificationEventEnum.APPLICATION_ACCEPTED,
                NotificationPriorityEnum.NORMAL,
                actorId,
                tripId,
                applicationId,
                null,
                null,
                null,
                "application_accepted:" + applicationId,
                NotificationTextUtils.applicationAccepted(nicknameOf(actorId), titleOf(tripId)),
                null);
    }

    @Override
    public void notifyApplicationRejected(
            long recipientId, long actorId, long tripId, long applicationId) {
        write(
                recipientId,
                NotificationEventEnum.APPLICATION_REJECTED,
                NotificationPriorityEnum.NORMAL,
                actorId,
                tripId,
                applicationId,
                null,
                null,
                null,
                "application_rejected:" + applicationId,
                NotificationTextUtils.applicationRejected(nicknameOf(actorId), titleOf(tripId)),
                null);
    }

    @Override
    public void notifyApplicationClosed(
            long recipientId, long actorId, long tripId, long applicationId, String cancelReason) {
        write(
                recipientId,
                NotificationEventEnum.APPLICATION_CLOSED,
                NotificationPriorityEnum.NORMAL,
                actorId,
                tripId,
                applicationId,
                null,
                null,
                null,
                "application_closed:" + applicationId,
                NotificationTextUtils.applicationClosed(
                        titleOf(tripId), NotificationTextUtils.cancelReasonLabel(cancelReason)),
                null);
    }

    // ---------- 行程 ----------

    @Override
    public void notifyTripFull(long recipientId, Long actorId, long tripId) {
        write(
                recipientId,
                NotificationEventEnum.TRIP_FULL,
                NotificationPriorityEnum.NORMAL,
                actorId,
                tripId,
                null,
                null,
                null,
                null,
                "trip_full:" + tripId,
                NotificationTextUtils.tripFull(titleOf(tripId)),
                null);
    }

    @Override
    public void notifyTripOngoing(long recipientId, long tripId) {
        write(
                recipientId,
                NotificationEventEnum.TRIP_ONGOING,
                NotificationPriorityEnum.NORMAL,
                null,
                tripId,
                null,
                null,
                null,
                null,
                "trip_ongoing:" + tripId,
                NotificationTextUtils.tripOngoing(titleOf(tripId)),
                null);
    }

    @Override
    public void notifyTripCancelled(long recipientId, long actorId, long tripId, String cancelReason) {
        write(
                recipientId,
                NotificationEventEnum.TRIP_CANCELLED,
                NotificationPriorityEnum.NORMAL,
                actorId,
                tripId,
                null,
                null,
                null,
                null,
                "trip_cancelled:" + tripId,
                NotificationTextUtils.tripCancelled(
                        titleOf(tripId), NotificationTextUtils.cancelReasonLabel(cancelReason)),
                null);
    }

    @Override
    public void notifyTripCompleted(long recipientId, long actorId, long tripId) {
        write(
                recipientId,
                NotificationEventEnum.TRIP_COMPLETED,
                NotificationPriorityEnum.NORMAL,
                actorId,
                tripId,
                null,
                null,
                null,
                null,
                "trip_completed:" + tripId,
                NotificationTextUtils.tripCompleted(titleOf(tripId)),
                null);
    }

    // ---------- 聊天 ----------

    @Override
    public void notifyMessage(long recipientId, long actorId, ChatMessage message) {
        write(
                recipientId,
                NotificationEventEnum.MESSAGE,
                NotificationPriorityEnum.NORMAL,
                actorId,
                message.tripId(),
                null,
                message.id(),
                null,
                null,
                "message:" + message.id(),
                NotificationTextUtils.chatMessage(nicknameOf(actorId), titleOf(message.tripId())),
                message);
    }

    // ---------- 信用 ----------

    @Override
    public void notifyCreditChanged(
            long userId, int scoreBefore, int scoreAfter, Long ledgerId, String reasonCode) {
        boolean recovered = scoreAfter >= scoreBefore
                && "SAFETY_LEARNING_RECOVERY".equals(reasonCode)
                && scoreAfter >= LOW_CREDIT_THRESHOLD;
        boolean low = scoreAfter < LOW_CREDIT_THRESHOLD;
        Draft draft = recovered
                ? NotificationTextUtils.creditRecovered(
                        scoreAfter, NotificationTextUtils.creditReasonLabel(reasonCode))
                : NotificationTextUtils.creditChanged(
                        scoreAfter - scoreBefore,
                        scoreAfter,
                        NotificationTextUtils.creditReasonLabel(reasonCode),
                        low);
        write(
                userId,
                recovered ? NotificationEventEnum.CREDIT_RECOVERED : NotificationEventEnum.CREDIT_CHANGED,
                low || recovered ? NotificationPriorityEnum.HIGH : NotificationPriorityEnum.NORMAL,
                null,
                null,
                null,
                null,
                null,
                null,
                creditDedupeKey(userId, scoreBefore, scoreAfter, ledgerId),
                draft,
                null);
    }

    // ---------- 举报 ----------

    @Override
    public void notifyReportSubmitted(long reporterId, long reportId) {
        write(
                reporterId,
                NotificationEventEnum.REPORT_SUBMITTED,
                NotificationPriorityEnum.NORMAL,
                null,
                null,
                null,
                null,
                reportId,
                null,
                "report_submitted:" + reportId,
                NotificationTextUtils.reportSubmitted(reportId),
                null);
    }

    @Override
    public void notifyReportProcessing(long reporterId, long reportId) {
        write(
                reporterId,
                NotificationEventEnum.REPORT_PROCESSING,
                NotificationPriorityEnum.NORMAL,
                null,
                null,
                null,
                null,
                reportId,
                null,
                "report_processing:" + reportId,
                NotificationTextUtils.reportProcessing(reportId),
                null);
    }

    @Override
    public void notifyReportResolved(long reporterId, long reportId, boolean rejected) {
        write(
                reporterId,
                NotificationEventEnum.REPORT_RESOLVED,
                NotificationPriorityEnum.NORMAL,
                null,
                null,
                null,
                null,
                reportId,
                null,
                "report_resolved:" + reportId,
                NotificationTextUtils.reportResolved(reportId, rejected),
                null);
    }

    // ---------- 账号 ----------

    @Override
    public void notifyAccountStatus(
            long userId,
            AccountStatusEnum status,
            String banReasonCode,
            String banExpiresAt,
            String occurredAt) {
        NotificationEventEnum event;
        Draft draft;
        switch (status) {
            case SUSPENDED -> {
                event = NotificationEventEnum.ACCOUNT_SUSPENDED;
                draft = NotificationTextUtils.accountSuspended();
            }
            case BANNED -> {
                event = NotificationEventEnum.ACCOUNT_BANNED;
                draft = NotificationTextUtils.accountBanned(
                        NotificationTextUtils.banReasonLabel(banReasonCode), banExpiresAt);
            }
            default -> {
                event = NotificationEventEnum.ACCOUNT_RESTORED;
                draft = NotificationTextUtils.accountRestored();
            }
        }
        String stamp = occurredAt == null || occurredAt.isBlank()
                ? clock.instant().toString()
                : occurredAt;
        write(
                userId,
                event,
                NotificationPriorityEnum.NORMAL,
                null,
                null,
                null,
                null,
                null,
                null,
                "account:" + status.code() + ":" + stamp,
                draft,
                null);
    }

    // ---------- 客服 ----------

    @Override
    public void notifyServiceJoined(long userId, long sessionId) {
        write(
                userId,
                NotificationEventEnum.SERVICE_JOINED,
                NotificationPriorityEnum.NORMAL,
                null,
                null,
                null,
                null,
                null,
                sessionId,
                "service_joined:" + sessionId,
                NotificationTextUtils.serviceJoined(),
                null);
    }

    @Override
    public void notifyServiceReply(long userId, long sessionId, long messageId) {
        write(
                userId,
                NotificationEventEnum.SERVICE_REPLY,
                NotificationPriorityEnum.NORMAL,
                null,
                null,
                null,
                null,
                null,
                sessionId,
                "service_reply:" + messageId,
                NotificationTextUtils.serviceReply(),
                null);
    }

    @Override
    public void notifyServiceClosed(long userId, long sessionId) {
        write(
                userId,
                NotificationEventEnum.SERVICE_CLOSED,
                NotificationPriorityEnum.NORMAL,
                null,
                null,
                null,
                null,
                null,
                sessionId,
                "service_closed:" + sessionId,
                NotificationTextUtils.serviceClosed(),
                null);
    }

    // ---------- 系统 ----------

    @Override
    public void notifySystemSafetyReminder(long recipientId, long tripId) {
        write(
                recipientId,
                NotificationEventEnum.SAFETY_REMINDER,
                NotificationPriorityEnum.NORMAL,
                null,
                tripId,
                null,
                null,
                null,
                null,
                "system_safety:" + tripId,
                NotificationTextUtils.safetyReminder(titleOf(tripId)),
                null);
    }

    @Override
    public void notifyIdentityVerified(long userId) {
        write(
                userId,
                NotificationEventEnum.IDENTITY_VERIFIED,
                NotificationPriorityEnum.NORMAL,
                null,
                null,
                null,
                null,
                null,
                null,
                "system_identity:" + userId,
                NotificationTextUtils.identityVerified(),
                null);
    }

    // ---------- 读取 ----------

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
                .eq(NotificationEntity::getType, NotificationTypeEnum.CHAT.wireValue())
                .eq(NotificationEntity::getTripId, tripId)
                .eq(NotificationEntity::getActorId, otherUserId)
                .set(NotificationEntity::getReadAt, clock.instant().toString())
                .update();
        return counts(recipientId);
    }

    // ---------- 写入与描述 ----------

    private void write(
            long recipientId,
            NotificationEventEnum event,
            NotificationPriorityEnum priority,
            Long actorId,
            Long tripId,
            Long applicationId,
            Long messageId,
            Long reportId,
            Long sessionId,
            String dedupeKey,
            Draft draft,
            ChatMessage message) {
        if (actorId != null && actorId == recipientId) {
            return;
        }
        try {
            if (exists(recipientId, dedupeKey)) {
                return;
            }
            Notification notification = new Notification(
                    nextId(NotificationEntity::getId),
                    recipientId,
                    event.type(),
                    event.wireValue(),
                    draft.title(),
                    draft.content(),
                    priority,
                    actorId,
                    tripId,
                    applicationId,
                    messageId,
                    reportId,
                    sessionId,
                    dedupeKey,
                    clock.instant(),
                    null);
            save(NotificationEntity.from(notification));
            publish(
                    recipientId,
                    new NotificationEventResponse(
                            describe(notification), message == null ? null : ChatMessageResponse.from(message)));
        } catch (DuplicateKeyException exception) {
            // 并发重复事件：唯一索引兜底，静默跳过。
            log.debug("notification deduplicated: recipient={}, key={}", recipientId, dedupeKey);
        } catch (RuntimeException exception) {
            log.warn(
                    "notification skipped: event={}, recipient={}, trip={}",
                    event.wireValue(), recipientId, tripId, exception);
        }
    }

    private boolean exists(long recipientId, String dedupeKey) {
        return count(Wrappers.<NotificationEntity>lambdaQuery()
                .eq(NotificationEntity::getRecipientId, recipientId)
                .eq(NotificationEntity::getDedupeKey, dedupeKey)) > 0;
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
        Map<String, Long> byType = new LinkedHashMap<>();
        long total = 0;
        for (NotificationTypeEnum type : NotificationTypeEnum.values()) {
            long count = lambdaQuery()
                    .eq(NotificationEntity::getRecipientId, recipientId)
                    .isNull(NotificationEntity::getReadAt)
                    .eq(NotificationEntity::getType, type.wireValue())
                    .count();
            byType.put(type.wireValue(), count);
            total += count;
        }
        return new NotificationCountsResponse(total, byType);
    }

    private NotificationResponse describe(NotificationEntity entity) {
        return describe(entity.toNotification());
    }

    private NotificationResponse describe(Notification notification) {
        DemoUser actor = null;
        if (notification.actorId() != null) {
            UserEntity row = demoUserService.getById(notification.actorId());
            actor = row == null ? null : row.toDemoUser(clock);
        }
        NotificationTargetResponse target = targetOf(notification);
        return NotificationResponse.from(
                notification,
                actor,
                titleOf(notification.tripId()),
                target,
                relatedAvailable(notification));
    }

    private NotificationTargetResponse targetOf(Notification notification) {
        Long tripId = notification.tripId();
        return switch (notification.type()) {
            case TRIP -> new NotificationTargetResponse(
                    NotificationTargetKindEnum.TRIP.wireValue(), tripId, null, null, null, null);
            case APPLICATION -> new NotificationTargetResponse(
                    NotificationEventEnum.APPLICATION_RECEIVED.wireValue().equals(notification.event())
                            ? NotificationTargetKindEnum.APPLICATIONS.wireValue()
                            : NotificationTargetKindEnum.TRIP.wireValue(),
                    tripId,
                    null,
                    notification.applicationId(),
                    null,
                    null);
            case CHAT -> new NotificationTargetResponse(
                    NotificationTargetKindEnum.CHAT.wireValue(),
                    tripId,
                    notification.actorId(),
                    null,
                    null,
                    null);
            case CREDIT -> new NotificationTargetResponse(
                    NotificationTargetKindEnum.CREDIT.wireValue(), null, null, null, null, null);
            case REPORT -> new NotificationTargetResponse(
                    NotificationTargetKindEnum.REPORT.wireValue(),
                    null,
                    null,
                    null,
                    notification.reportId(),
                    null);
            case ACCOUNT -> new NotificationTargetResponse(
                    NotificationTargetKindEnum.ACCOUNT.wireValue(), null, null, null, null, null);
            case SERVICE -> new NotificationTargetResponse(
                    NotificationTargetKindEnum.SUPPORT.wireValue(),
                    null,
                    null,
                    null,
                    null,
                    notification.sessionId());
            case SYSTEM -> new NotificationTargetResponse(
                    NotificationEventEnum.IDENTITY_VERIFIED.wireValue().equals(notification.event())
                            ? NotificationTargetKindEnum.IDENTITY.wireValue()
                            : NotificationTargetKindEnum.TRIP.wireValue(),
                    NotificationEventEnum.IDENTITY_VERIFIED.wireValue().equals(notification.event())
                            ? null
                            : tripId,
                    null,
                    null,
                    null,
                    null);
        };
    }

    private boolean relatedAvailable(Notification notification) {
        long recipientId = notification.recipientId();
        return switch (notification.type()) {
            case REPORT -> {
                ReportEntity report = notification.reportId() == null
                        ? null
                        : reportMapper.selectById(notification.reportId());
                yield report != null && report.getReporterId() != null
                        && report.getReporterId() == recipientId;
            }
            case SERVICE -> {
                CustomerServiceSessionEntity session = notification.sessionId() == null
                        ? null
                        : sessionMapper.selectById(notification.sessionId());
                yield session != null && session.getUserId() != null
                        && session.getUserId() == recipientId;
            }
            case CREDIT, ACCOUNT -> true;
            default -> tripExists(notification.tripId());
        };
    }

    private boolean tripExists(Long tripId) {
        return tripId != null && tripPlanService.getById(tripId) != null;
    }

    private String titleOf(Long tripId) {
        if (tripId == null) {
            return null;
        }
        TripPlanEntity entity = tripPlanService.getById(tripId);
        return entity == null ? null : entity.toTripPlan().title();
    }

    private String nicknameOf(long userId) {
        UserEntity row = demoUserService.getById(userId);
        return row == null ? "某位用户" : row.toDemoUser(clock).nickname();
    }

    private static String creditDedupeKey(
            long userId, int scoreBefore, int scoreAfter, Long ledgerId) {
        if (ledgerId != null) {
            return "credit:" + ledgerId;
        }
        return "credit:" + userId + ":" + scoreBefore + ":" + scoreAfter;
    }
}