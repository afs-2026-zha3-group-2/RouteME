package routeme.service.impl;

import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import routeme.entity.CustomerServiceMessageEntity;
import routeme.entity.CustomerServiceSessionEntity;
import routeme.entity.UserEntity;
import routeme.enums.AccountRoleEnum;
import routeme.enums.AccountStatusEnum;
import routeme.enums.ServiceSessionStatusEnum;
import routeme.enums.WriteScopeEnum;
import routeme.exception.InvalidInputException;
import routeme.exception.SessionAlreadyHandlingException;
import routeme.exception.SessionClosedException;
import routeme.exception.SessionNotHandlingException;
import routeme.mapper.CustomerServiceMessageMapper;
import routeme.mapper.CustomerServiceSessionMapper;
import routeme.param.PageParam;
import routeme.pojo.CustomerServiceMessage;
import routeme.pojo.CustomerServiceSession;
import routeme.pojo.PageResult;
import routeme.pojo.Report;
import routeme.response.AdminUserReportRef;
import routeme.response.ServiceMessageResponse;
import routeme.response.ServiceSessionDetailResponse;
import routeme.response.ServiceSessionSummaryResponse;
import routeme.response.ServiceUserResponse;
import routeme.service.AccountStatusService;
import routeme.service.AdminReportService;
import routeme.service.CustomerService;
import routeme.service.DemoUserService;
import routeme.service.ReportTargetService;

/** 客服会话与消息实现（design §5.6）。 */
@Service
public class CustomerServiceImpl implements CustomerService {

    private static final int MAX_MESSAGE_LENGTH = 500;
    private static final int DETAIL_REPORT_LIMIT = 50;

    private final CustomerServiceSessionMapper sessionMapper;
    private final CustomerServiceMessageMapper messageMapper;
    private final DemoUserService demoUserService;
    private final AccountStatusService accountStatusService;
    private final AdminReportService adminReportService;
    private final ReportTargetService reportTargetService;
    private final Clock clock;

    public CustomerServiceImpl(
            CustomerServiceSessionMapper sessionMapper,
            CustomerServiceMessageMapper messageMapper,
            DemoUserService demoUserService,
            AccountStatusService accountStatusService,
            AdminReportService adminReportService,
            ReportTargetService reportTargetService,
            Clock clock) {
        this.sessionMapper = sessionMapper;
        this.messageMapper = messageMapper;
        this.demoUserService = demoUserService;
        this.accountStatusService = accountStatusService;
        this.adminReportService = adminReportService;
        this.reportTargetService = reportTargetService;
        this.clock = clock;
    }

    @Override
    public Optional<ServiceSessionDetailResponse> current(long userId) {
        return openSession(userId).map(session -> detail(session, false));
    }

    @Override
    @Transactional
    public ServiceSessionDetailResponse createOrGet(long userId) {
        accountStatusService.assertCanWrite(userId, WriteScopeEnum.SUPPORT);
        Optional<CustomerServiceSession> open = openSession(userId);
        if (open.isPresent()) {
            return detail(open.get(), false);
        }
        CustomerServiceSessionEntity entity = new CustomerServiceSessionEntity();
        entity.setId(nextSessionId());
        entity.setUserId(userId);
        entity.setStatus(ServiceSessionStatusEnum.WAITING.code());
        entity.setCreatedAt(clock.instant().toString());
        sessionMapper.insert(entity);
        return detail(entity.toSession(), false);
    }

    @Override
    public Optional<List<ServiceMessageResponse>> listMessages(long sessionId, long userId) {
        Optional<CustomerServiceSession> session = ownedSession(sessionId, userId);
        return session.map(value -> messagesOf(value.id()).stream()
                .map(this::messageResponse)
                .toList());
    }

    @Override
    @Transactional
    public Optional<ServiceMessageResponse> sendUserMessage(long sessionId, long userId, String content) {
        accountStatusService.assertCanWrite(userId, WriteScopeEnum.SUPPORT);
        Optional<CustomerServiceSession> session = ownedSession(sessionId, userId);
        if (session.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(appendMessage(session.get(), "USER", userId, content));
    }

    @Override
    @Transactional
    public Optional<ServiceMessageResponse> sendAdminMessage(long sessionId, long adminId, String content) {
        CustomerServiceSessionEntity entity = sessionMapper.selectById(sessionId);
        if (entity == null) {
            return Optional.empty();
        }
        CustomerServiceSession session = entity.toSession();
        return Optional.of(appendMessage(session, AccountRoleEnum.ADMIN.code(), adminId, content));
    }

    @Override
    public PageResult<ServiceSessionSummaryResponse> adminList(String status, int page, int size) {
        PageParam param = PageParam.parse(page, size);
        ServiceSessionStatusEnum filter = null;
        if (status != null && !status.isBlank()) {
            filter = ServiceSessionStatusEnum.of(status.trim().toUpperCase(Locale.ROOT));
        }
        final ServiceSessionStatusEnum statusFilter = filter;
        List<CustomerServiceSession> sessions = sessionMapper.selectList(null).stream()
                .map(CustomerServiceSessionEntity::toSession)
                .filter(session -> statusFilter == null || statusFilter.code().equals(session.status()))
                .sorted(queueOrder())
                .toList();
        List<ServiceSessionSummaryResponse> items = param.slice(sessions).stream()
                .map(this::summary)
                .toList();
        return new PageResult<>(items, param.page(), param.size(), sessions.size());
    }

    @Override
    public Optional<ServiceSessionDetailResponse> adminDetail(long sessionId) {
        CustomerServiceSessionEntity entity = sessionMapper.selectById(sessionId);
        return entity == null ? Optional.empty() : Optional.of(detail(entity.toSession(), true));
    }

    @Override
    @Transactional
    public Optional<ServiceSessionDetailResponse> join(long sessionId, long adminId) {
        CustomerServiceSessionEntity entity = sessionMapper.selectById(sessionId);
        if (entity == null) {
            return Optional.empty();
        }
        boolean updated = sessionMapper.update(null, Wrappers.<CustomerServiceSessionEntity>lambdaUpdate()
                .eq(CustomerServiceSessionEntity::getId, sessionId)
                .eq(CustomerServiceSessionEntity::getStatus, ServiceSessionStatusEnum.WAITING.code())
                .set(CustomerServiceSessionEntity::getStatus, ServiceSessionStatusEnum.HANDLING.code())
                .set(CustomerServiceSessionEntity::getJoinedBy, adminId)
                .set(CustomerServiceSessionEntity::getJoinedAt, clock.instant().toString())) > 0;
        if (!updated) {
            throw new SessionAlreadyHandlingException(sessionId);
        }
        return adminDetail(sessionId);
    }

    @Override
    @Transactional
    public Optional<ServiceSessionDetailResponse> closeByUser(long sessionId, long userId) {
        accountStatusService.assertCanWrite(userId, WriteScopeEnum.SUPPORT);
        CustomerServiceSessionEntity entity = sessionMapper.selectById(sessionId);
        if (entity == null || !Objects.equals(entity.getUserId(), userId)) {
            return Optional.empty();
        }
        boolean updated = sessionMapper.update(null, Wrappers.<CustomerServiceSessionEntity>lambdaUpdate()
                .eq(CustomerServiceSessionEntity::getId, sessionId)
                .eq(CustomerServiceSessionEntity::getUserId, userId)
                .in(CustomerServiceSessionEntity::getStatus,
                        ServiceSessionStatusEnum.WAITING.code(),
                        ServiceSessionStatusEnum.HANDLING.code(),
                        ServiceSessionStatusEnum.RESOLVED.code())
                .set(CustomerServiceSessionEntity::getStatus, ServiceSessionStatusEnum.CLOSED.code())
                .set(CustomerServiceSessionEntity::getClosedBy, userId)
                .set(CustomerServiceSessionEntity::getClosedAt, clock.instant().toString())) > 0;
        if (!updated) {
            throw new SessionClosedException(sessionId);
        }
        return Optional.of(detail(sessionMapper.selectById(sessionId).toSession(), false));
    }

    @Override
    @Transactional
    public Optional<ServiceSessionDetailResponse> resolve(long sessionId, long adminId) {
        CustomerServiceSessionEntity entity = sessionMapper.selectById(sessionId);
        if (entity == null) {
            return Optional.empty();
        }
        boolean updated = sessionMapper.update(null, Wrappers.<CustomerServiceSessionEntity>lambdaUpdate()
                .eq(CustomerServiceSessionEntity::getId, sessionId)
                .eq(CustomerServiceSessionEntity::getStatus, ServiceSessionStatusEnum.HANDLING.code())
                .set(CustomerServiceSessionEntity::getStatus, ServiceSessionStatusEnum.RESOLVED.code())
                .set(CustomerServiceSessionEntity::getResolvedBy, adminId)
                .set(CustomerServiceSessionEntity::getResolvedAt, clock.instant().toString())) > 0;
        if (!updated) {
            throw new SessionNotHandlingException(sessionId);
        }
        return adminDetail(sessionId);
    }

    @Override
    public List<AdminUserReportRef> reportsForUser(long userId) {
        return adminReportService.findAll().stream()
                .filter(report -> involved(report, userId))
                .limit(DETAIL_REPORT_LIMIT)
                .map(report -> new AdminUserReportRef(
                        report.id(),
                        AdminReportServiceImpl.code(report.id()),
                        report.reporterId() == userId ? "REPORTER" : "REPORTED",
                        report.status(),
                        report.reason(),
                        report.createdAt().toString()))
                .toList();
    }

    private ServiceMessageResponse appendMessage(
            CustomerServiceSession session, String senderType, long senderId, String content) {
        if (ServiceSessionStatusEnum.CLOSED.code().equals(session.status())) {
            throw new SessionClosedException(session.id());
        }
        String trimmed = content == null ? "" : content.trim();
        if (trimmed.isEmpty() || trimmed.length() > MAX_MESSAGE_LENGTH) {
            throw new InvalidInputException(
                    "content must be between 1 and " + MAX_MESSAGE_LENGTH + " characters");
        }
        if (ServiceSessionStatusEnum.RESOLVED.code().equals(session.status())) {
            boolean promoted = sessionMapper.update(null, Wrappers.<CustomerServiceSessionEntity>lambdaUpdate()
                    .eq(CustomerServiceSessionEntity::getId, session.id())
                    .eq(CustomerServiceSessionEntity::getStatus, ServiceSessionStatusEnum.RESOLVED.code())
                    .set(CustomerServiceSessionEntity::getStatus, ServiceSessionStatusEnum.HANDLING.code())
                    .set(CustomerServiceSessionEntity::getResolvedAt, null)
                    .set(CustomerServiceSessionEntity::getResolvedBy, null)) > 0;
            if (!promoted) {
                CustomerServiceSessionEntity latest = sessionMapper.selectById(session.id());
                if (latest == null
                        || ServiceSessionStatusEnum.CLOSED.code().equals(latest.getStatus())) {
                    throw new SessionClosedException(session.id());
                }
            }
        }
        CustomerServiceMessageEntity entity = new CustomerServiceMessageEntity();
        entity.setId(nextMessageId());
        entity.setSessionId(session.id());
        entity.setSenderType(senderType);
        entity.setSenderId(senderId);
        entity.setContent(trimmed);
        entity.setCreatedAt(clock.instant().toString());
        messageMapper.insert(entity);
        return messageResponse(entity.toMessage());
    }

    private ServiceSessionDetailResponse detail(CustomerServiceSession session, boolean includeReports) {
        ServiceSessionSummaryResponse summary = summary(session);
        List<ServiceMessageResponse> messages = messagesOf(session.id()).stream()
                .map(this::messageResponse)
                .toList();
        List<AdminUserReportRef> reports = includeReports ? reportsForUser(session.userId()) : null;
        return new ServiceSessionDetailResponse(
                summary.id(),
                summary.user(),
                summary.status(),
                summary.createdAt(),
                summary.joinedAt(),
                summary.closedAt(),
                summary.resolvedAt(),
                summary.lastMessageAt(),
                summary.messageCount(),
                messages,
                reports);
    }

    private ServiceSessionSummaryResponse summary(CustomerServiceSession session) {
        List<CustomerServiceMessage> messages = messagesOf(session.id());
        CustomerServiceMessage last = messages.isEmpty() ? null : messages.getLast();
        return new ServiceSessionSummaryResponse(
                session.id(),
                user(session.userId()),
                session.status(),
                session.createdAt().toString(),
                session.joinedAt() == null ? null : session.joinedAt().toString(),
                session.closedAt() == null ? null : session.closedAt().toString(),
                session.resolvedAt() == null ? null : session.resolvedAt().toString(),
                last == null ? null : last.createdAt().toString(),
                messages.size());
    }

    private ServiceUserResponse user(long userId) {
        UserEntity entity = demoUserService.getById(userId);
        if (entity == null) {
            return new ServiceUserResponse(userId, null, null, null, null, null);
        }
        AccountStatusEnum status = accountStatusService.effectiveStatus(entity);
        return new ServiceUserResponse(
                entity.getId(),
                entity.getNickname(),
                entity.getAvatarInitial(),
                entity.getEmail(),
                status.code(),
                entity.getCreatedAt());
    }

    private ServiceMessageResponse messageResponse(CustomerServiceMessage message) {
        UserEntity sender = demoUserService.getById(message.senderId());
        return new ServiceMessageResponse(
                message.id(),
                message.sessionId(),
                message.senderType(),
                message.senderId(),
                sender == null ? null : sender.getNickname(),
                message.content(),
                message.createdAt().toString());
    }

    private Optional<CustomerServiceSession> openSession(long userId) {
        return sessionMapper.selectList(Wrappers.<CustomerServiceSessionEntity>lambdaQuery()
                        .eq(CustomerServiceSessionEntity::getUserId, userId)
                        .in(CustomerServiceSessionEntity::getStatus,
                                ServiceSessionStatusEnum.WAITING.code(),
                                ServiceSessionStatusEnum.HANDLING.code(),
                                ServiceSessionStatusEnum.RESOLVED.code())
                        .orderByDesc(CustomerServiceSessionEntity::getCreatedAt)
                        .orderByDesc(CustomerServiceSessionEntity::getId))
                .stream()
                .findFirst()
                .map(CustomerServiceSessionEntity::toSession);
    }

    private Optional<CustomerServiceSession> ownedSession(long sessionId, long userId) {
        CustomerServiceSessionEntity entity = sessionMapper.selectById(sessionId);
        if (entity == null || !Objects.equals(entity.getUserId(), userId)) {
            return Optional.empty();
        }
        return Optional.of(entity.toSession());
    }

    private List<CustomerServiceMessage> messagesOf(long sessionId) {
        return messageMapper.selectList(Wrappers.<CustomerServiceMessageEntity>lambdaQuery()
                        .eq(CustomerServiceMessageEntity::getSessionId, sessionId)
                        .orderByAsc(CustomerServiceMessageEntity::getId))
                .stream()
                .map(CustomerServiceMessageEntity::toMessage)
                .toList();
    }

    private boolean involved(Report report, long userId) {
        return report.reporterId() == userId
                || Objects.equals(reportTargetService.reportedUserId(report), userId);
    }

    private long nextSessionId() {
        List<CustomerServiceSessionEntity> rows = sessionMapper.selectList(
                Wrappers.<CustomerServiceSessionEntity>lambdaQuery()
                        .select(CustomerServiceSessionEntity::getId)
                        .orderByDesc(CustomerServiceSessionEntity::getId)
                        .last("LIMIT 1"));
        return rows.isEmpty() ? 1L : rows.getFirst().getId() + 1L;
    }

    private long nextMessageId() {
        List<CustomerServiceMessageEntity> rows = messageMapper.selectList(
                Wrappers.<CustomerServiceMessageEntity>lambdaQuery()
                        .select(CustomerServiceMessageEntity::getId)
                        .orderByDesc(CustomerServiceMessageEntity::getId)
                        .last("LIMIT 1"));
        return rows.isEmpty() ? 1L : rows.getFirst().getId() + 1L;
    }

    private static Comparator<CustomerServiceSession> queueOrder() {
        return (left, right) -> {
            boolean leftWaiting = ServiceSessionStatusEnum.WAITING.code().equals(left.status());
            boolean rightWaiting = ServiceSessionStatusEnum.WAITING.code().equals(right.status());
            if (leftWaiting != rightWaiting) {
                return leftWaiting ? -1 : 1;
            }
            int byCreated = left.createdAt().compareTo(right.createdAt());
            return leftWaiting ? byCreated : -byCreated;
        };
    }
}