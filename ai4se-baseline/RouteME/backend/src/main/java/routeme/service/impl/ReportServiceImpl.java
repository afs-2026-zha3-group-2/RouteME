package routeme.service.impl;

import java.time.Clock;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

import routeme.entity.ReportEntity;
import routeme.enums.ReportStatusEnum;
import routeme.enums.WriteScopeEnum;
import routeme.exception.ChatNotAllowedException;
import routeme.exception.InvalidInputException;
import routeme.exception.TripNotFoundException;
import routeme.mapper.ReportMapper;
import routeme.pojo.Report;
import routeme.request.ReportRequest;
import routeme.service.AccountStatusService;
import routeme.service.ChatService;
import routeme.service.NotificationService;
import routeme.service.ReportService;

/**
 * Persists reports after enum and length validation, and reads the reporter's own list.
 * Guards run first so restricted accounts do not learn business details (design §5.4).
 */
@Service
public class ReportServiceImpl extends AbstractServiceImpl<ReportMapper, ReportEntity>
        implements ReportService {

    private static final Set<String> TARGET_TYPES = Set.of("trip", "user", "experience");
    private static final Set<String> REASONS = Set.of("harassment", "fake", "safety", "other");
    private static final int MAX_NOTE_LENGTH = 200;

    private final Clock clock;
    private final AccountStatusService accountStatusService;
    private final ChatService chatService;
    private final NotificationService notificationService;

    public ReportServiceImpl(
            Clock clock,
            AccountStatusService accountStatusService,
            ChatService chatService,
            NotificationService notificationService) {
        this.clock = clock;
        this.accountStatusService = accountStatusService;
        this.chatService = chatService;
        this.notificationService = notificationService;
    }

    @Override
    @Transactional
    public Report submit(long reporterId, ReportRequest request) {
        accountStatusService.assertCanWrite(reporterId, WriteScopeEnum.REPORT);
        if (request == null) {
            throw new InvalidInputException("report body is required");
        }
        String targetType = requireOption(request.targetType(), TARGET_TYPES, "target_type");
        String reason = requireOption(request.reason(), REASONS, "reason");
        if (request.targetId() == null || request.targetId() <= 0) {
            throw new InvalidInputException("target_id is required");
        }
        Report report = new Report(
                nextId(ReportEntity::getId),
                targetType,
                request.targetId(),
                reporterId,
                reason,
                normalizeNote(request.note()),
                normalizeContextTripId(reporterId, targetType, request.targetId(), request.tripId()),
                clock.instant(),
                ReportStatusEnum.PENDING.code(),
                null,
                null,
                null,
                null,
                null,
                null,
                null);
        save(ReportEntity.from(report));
        notificationService.notifyReportSubmitted(reporterId, report.id());
        return report;
    }

    @Override
    public List<Report> listMine(long reporterId, int limit) {
        if (limit <= 0) {
            return List.of();
        }
        List<ReportEntity> rows = page(
                new Page<>(1, limit, false),
                Wrappers.<ReportEntity>lambdaQuery()
                        .eq(ReportEntity::getReporterId, reporterId)
                        .orderByDesc(ReportEntity::getCreatedAt)
                        .orderByDesc(ReportEntity::getId))
                .getRecords();
        return rows.stream().map(ReportEntity::toReport).toList();
    }

    @Override
    public long countMine(long reporterId) {
        return count(Wrappers.<ReportEntity>lambdaQuery().eq(ReportEntity::getReporterId, reporterId));
    }

    /**
     * A chat report pins the trip whose conversation the reporter was reading. Only user
     * targets carry it, and the pair must actually share that trip chat so an administrator
     * never reads an unrelated conversation.
     */
    private Long normalizeContextTripId(long reporterId, String targetType, long targetId, Long tripId) {
        if (tripId == null) {
            return null;
        }
        if (tripId <= 0) {
            throw new InvalidInputException("trip_id must be a positive id");
        }
        if (!"user".equals(targetType)) {
            throw new InvalidInputException("trip_id is only allowed when reporting a chat participant");
        }
        try {
            chatService.conversation(tripId, reporterId, targetId);
        } catch (ChatNotAllowedException | TripNotFoundException caught) {
            throw new InvalidInputException("trip_id must reference a chat between reporter and target");
        }
        return tripId;
    }

    private String requireOption(String value, Set<String> allowed, String field) {
        String trimmed = value == null ? "" : value.trim();
        if (!allowed.contains(trimmed)) {
            throw new InvalidInputException(field + " must be one of " + allowed);
        }
        return trimmed;
    }

    private String normalizeNote(String note) {
        if (note == null) {
            return null;
        }
        String trimmed = note.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        if (trimmed.length() > MAX_NOTE_LENGTH) {
            throw new InvalidInputException("note must be at most " + MAX_NOTE_LENGTH + " characters");
        }
        return trimmed;
    }
}