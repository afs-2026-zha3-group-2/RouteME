package routeme.service;

import java.time.Clock;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import routeme.dao.ReportRepository;
import routeme.dto.ReportRequest;
import routeme.exception.InvalidInput;
import routeme.model.Report;

@Service
public class ReportService {

    private static final Set<String> TARGET_TYPES = Set.of("trip", "user");
    private static final Set<String> REASONS = Set.of("harassment", "fake", "safety", "other");
    private static final int MAX_NOTE_LENGTH = 200;

    private final ReportRepository reportRepository;
    private final Clock clock;

    public ReportService(ReportRepository reportRepository, Clock clock) {
        this.reportRepository = reportRepository;
        this.clock = clock;
    }

    @Transactional
    public Report submit(long reporterId, ReportRequest request) {
        if (request == null) {
            throw new InvalidInput("report body is required");
        }
        String targetType = requireOption(request.targetType(), TARGET_TYPES, "target_type");
        String reason = requireOption(request.reason(), REASONS, "reason");
        if (request.targetId() == null || request.targetId() <= 0) {
            throw new InvalidInput("target_id is required");
        }
        Report report = new Report(
                reportRepository.nextId(),
                targetType,
                request.targetId(),
                reporterId,
                reason,
                normalizeNote(request.note()),
                clock.instant());
        reportRepository.insert(report);
        return report;
    }

    private String requireOption(String value, Set<String> allowed, String field) {
        String trimmed = value == null ? "" : value.trim();
        if (!allowed.contains(trimmed)) {
            throw new InvalidInput(field + " must be one of " + allowed);
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
            throw new InvalidInput("note exceeds " + MAX_NOTE_LENGTH + " characters");
        }
        return trimmed;
    }
}