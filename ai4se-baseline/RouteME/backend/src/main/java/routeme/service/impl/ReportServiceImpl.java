package routeme.service.impl;

import java.time.Clock;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import routeme.exception.InvalidInputException;
import routeme.mapper.ReportMapper;
import routeme.pojo.Report;
import routeme.entity.ReportEntity;
import routeme.request.ReportRequest;
import routeme.service.ReportService;

/**
 * 举报的持久化实现：枚举值与长度校验后落库。
 * 方法契约以 {@link routeme.service.ReportService} 为准。
 */
@Service
public class ReportServiceImpl extends AbstractServiceImpl<ReportMapper, ReportEntity>
        implements ReportService {

    private static final Set<String> TARGET_TYPES = Set.of("trip", "user");
    private static final Set<String> REASONS = Set.of("harassment", "fake", "safety", "other");
    private static final int MAX_NOTE_LENGTH = 200;

    private final Clock clock;

    public ReportServiceImpl(Clock clock) {
        this.clock = clock;
    }

    @Override
    @Transactional
    public Report submit(long reporterId, ReportRequest request) {
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
                clock.instant());
        save(ReportEntity.from(report));
        return report;
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
            throw new InvalidInputException("note must be at most " + MAX_NOTE_LENGTH + " chars");
        }
        return trimmed;
    }
}