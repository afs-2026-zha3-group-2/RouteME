package routeme.service.impl;

import java.time.Clock;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import routeme.entity.ReportEntity;
import routeme.entity.TripPlanEntity;
import routeme.entity.UserEntity;
import routeme.enums.AccountStatusEnum;
import routeme.enums.ReportResolutionActionEnum;
import routeme.enums.ReportStatusEnum;
import routeme.enums.ReportViolationEnum;
import routeme.exception.InvalidInputException;
import routeme.exception.ReportNotFoundException;
import routeme.exception.ReportNotPendingException;
import routeme.exception.ReportNotProcessingException;
import routeme.mapper.ReportMapper;
import routeme.model.PenaltyRules;
import routeme.param.PageParam;
import routeme.pojo.ChatMessage;
import routeme.pojo.CreditBooking;
import routeme.pojo.GrowthBooking;
import routeme.pojo.PageResult;
import routeme.pojo.Report;
import routeme.pojo.TripPlan;
import routeme.pojo.UserCredit;
import routeme.request.AdminReportResolveRequest;
import routeme.response.AdminReportContextResponse;
import routeme.response.AdminReportDetailResponse;
import routeme.response.AdminReportMessageResponse;
import routeme.response.AdminReportSummaryResponse;
import routeme.response.AdminReportTargetResponse;
import routeme.response.AdminReportTripContextResponse;
import routeme.response.AdminUserRef;
import routeme.response.ReportedUserResponse;
import routeme.service.AccountStatusService;
import routeme.service.AdminReportService;
import routeme.service.ChatService;
import routeme.service.CreditService;
import routeme.service.DemoUserService;
import routeme.service.GrowthService;
import routeme.service.ReportService;
import routeme.service.ReportTargetService;
import routeme.service.TripPlanService;

/** 举报队列与处理事务实现（design §5.5）。 */
@Service
public class AdminReportServiceImpl extends AbstractServiceImpl<ReportMapper, ReportEntity>
        implements AdminReportService {

    private static final int MAX_RESOLUTION_NOTE_LENGTH = 500;

    private final ReportService reportService;
    private final ReportTargetService targetService;
    private final AccountStatusService accountStatusService;
    private final CreditService creditService;
    private final DemoUserService demoUserService;
    private final ChatService chatService;
    private final TripPlanService tripPlanService;
    private final GrowthService growthService;
    private final Clock clock;

    public AdminReportServiceImpl(
            ReportService reportService,
            ReportTargetService targetService,
            AccountStatusService accountStatusService,
            CreditService creditService,
            DemoUserService demoUserService,
            ChatService chatService,
            TripPlanService tripPlanService,
            GrowthService growthService,
            Clock clock) {
        this.reportService = reportService;
        this.targetService = targetService;
        this.accountStatusService = accountStatusService;
        this.creditService = creditService;
        this.demoUserService = demoUserService;
        this.chatService = chatService;
        this.tripPlanService = tripPlanService;
        this.growthService = growthService;
        this.clock = clock;
    }

    @Override
    public PageResult<AdminReportSummaryResponse> list(String status, int page, int size) {
        PageParam param = PageParam.parse(page, size);
        String filter = null;
        if (status != null && !status.isBlank()) {
            filter = ReportStatusEnum.of(status.trim().toUpperCase(Locale.ROOT)).code();
        }
        final String statusFilter = filter;
        List<Report> filtered = findAll().stream()
                .filter(report -> statusFilter == null || statusFilter.equals(report.status()))
                .toList();
        List<AdminReportSummaryResponse> items = param.slice(filtered).stream()
                .map(this::summary)
                .toList();
        return new PageResult<>(items, param.page(), param.size(), filtered.size());
    }

    @Override
    public AdminReportDetailResponse detail(long reportId) {
        return detailOf(require(reportId));
    }

    @Override
    @Transactional
    public AdminReportDetailResponse start(long reportId, long adminId) {
        String now = clock.instant().toString();
        boolean updated = update(Wrappers.<ReportEntity>lambdaUpdate()
                .eq(ReportEntity::getId, reportId)
                .eq(ReportEntity::getStatus, ReportStatusEnum.PENDING.code())
                .set(ReportEntity::getStatus, ReportStatusEnum.PROCESSING.code())
                .set(ReportEntity::getProcessedBy, adminId)
                .set(ReportEntity::getProcessingAt, now));
        if (!updated) {
            Report current = getById(reportId) == null ? null : getById(reportId).toReport();
            if (current == null) {
                throw new ReportNotFoundException(reportId);
            }
            throw new ReportNotPendingException(reportId, current.status());
        }
        return detailOf(require(reportId));
    }

    @Override
    @Transactional
    public AdminReportDetailResponse resolve(long reportId, long adminId, AdminReportResolveRequest request) {
        if (request == null) {
            throw new InvalidInputException("report resolution body is required");
        }
        String outcome = requireOutcome(request.outcome());
        String note = PenaltyRules.requireText(request.note(), "note", MAX_RESOLUTION_NOTE_LENGTH);
        Report existing = require(reportId);
        if (!ReportStatusEnum.PROCESSING.code().equals(existing.status())) {
            throw new ReportNotProcessingException(reportId, existing.status());
        }

        ReportViolationEnum violation = null;
        Long reportedUserId = null;
        int applied = 0;
        if (ReportStatusEnum.RESOLVED.code().equals(outcome)) {
            violation = ReportViolationEnum.parse(request.violationType());
            int deduction = violation.deduction(request.otherDeduction());
            reportedUserId = targetService.reportedUserId(existing);
            if (reportedUserId == null) {
                throw new InvalidInputException("reported user is no longer available");
            }
            // 只读快照：0 分截断时报告记 0；账本 applied_delta 仍为权威。
            UserCredit before = creditService.snapshot(reportedUserId);
            applied = Math.min(deduction, before.score());
        }

        String now = clock.instant().toString();
        boolean updated = update(Wrappers.<ReportEntity>lambdaUpdate()
                .eq(ReportEntity::getId, reportId)
                .eq(ReportEntity::getStatus, ReportStatusEnum.PROCESSING.code())
                .set(ReportEntity::getStatus, outcome)
                .set(ReportEntity::getResolvedAt, now)
                .set(ReportEntity::getResolutionNote, note)
                .set(ReportEntity::getResolutionAction,
                        ReportStatusEnum.RESOLVED.code().equals(outcome)
                                ? null
                                : ReportResolutionActionEnum.REJECT.code())
                .set(ReportEntity::getViolationType, violation == null ? null : violation.name())
                .set(ReportEntity::getAppliedDeduction,
                        ReportStatusEnum.RESOLVED.code().equals(outcome) ? applied : null));
        if (!updated) {
            throw new ReportNotProcessingException(reportId, require(reportId).status());
        }

        if (ReportStatusEnum.RESOLVED.code().equals(outcome)) {
            creditService.book(new CreditBooking(
                    reportedUserId,
                    "REPORT_VIOLATION",
                    -violation.deduction(request.otherDeduction()),
                    "REPORT",
                    String.valueOf(reportId),
                    "REPORT_VIOLATION:" + reportId));
            growthService.book(GrowthBooking.report(reportedUserId, reportId));
        }
        return detailOf(require(reportId));
    }

    @Override
    public List<Report> findAll() {
        return reportService.list(Wrappers.<ReportEntity>lambdaQuery()
                        .orderByDesc(ReportEntity::getCreatedAt)
                        .orderByDesc(ReportEntity::getId))
                .stream()
                .map(ReportEntity::toReport)
                .toList();
    }

    private Report require(long reportId) {
        ReportEntity entity = getById(reportId);
        if (entity == null) {
            throw new ReportNotFoundException(reportId);
        }
        return entity.toReport();
    }

    private AdminReportSummaryResponse summary(Report report) {
        Long reportedUserId = targetService.reportedUserId(report);
        UserCredit credit = reportedUserId == null ? null : creditService.snapshot(reportedUserId);
        return new AdminReportSummaryResponse(
                report.id(),
                code(report.id()),
                report.targetType(),
                report.targetId(),
                targetService.targetLabel(report),
                reporter(report),
                reportedUser(reportedUserId, credit),
                report.reason(),
                report.createdAt().toString(),
                report.status());
    }

    private AdminReportDetailResponse detailOf(Report report) {
        AdminReportSummaryResponse summary = summary(report);
        return new AdminReportDetailResponse(
                summary.id(),
                summary.code(),
                summary.targetType(),
                summary.targetId(),
                summary.targetLabel(),
                summary.reporter(),
                summary.reportedUser(),
                summary.reason(),
                summary.createdAt(),
                summary.status(),
                report.note(),
                new AdminReportTargetResponse(
                        report.targetType(),
                        report.targetId(),
                        summary.targetLabel(),
                        targetService.targetExists(report),
                        targetService.contentExcerpt(report)),
                contextOf(report),
                processedBy(report),
                report.processingAt() == null ? null : report.processingAt().toString(),
                report.resolvedAt() == null ? null : report.resolvedAt().toString(),
                report.resolutionNote(),
                report.resolutionAction(),
                report.violationType(),
                report.appliedDeduction());
    }

    /**
     * 举报来源：聊天举报回放举报人与被举报人在该行程下的会话，行程举报给出行程概要。
     * 早期的用户举报没有 {@code context_trip_id}，此时返回 {@code null}，前端退回对象摘要。
     */
    private AdminReportContextResponse contextOf(Report report) {
        if ("trip".equals(report.targetType())) {
            AdminReportTripContextResponse trip = tripContext(report.targetId());
            return trip == null ? null : new AdminReportContextResponse("trip", trip, List.of());
        }
        if ("user".equals(report.targetType()) && report.contextTripId() != null) {
            List<AdminReportMessageResponse> messages = chatService
                    .transcript(report.contextTripId(), report.reporterId(), report.targetId())
                    .stream()
                    .map(this::message)
                    .toList();
            return new AdminReportContextResponse(
                    "chat", tripContext(report.contextTripId()), messages);
        }
        return null;
    }

    private AdminReportTripContextResponse tripContext(long tripId) {
        TripPlanEntity entity = tripPlanService.getById(tripId);
        if (entity == null) {
            return null;
        }
        TripPlan trip = entity.toTripPlan();
        return new AdminReportTripContextResponse(
                trip.id(),
                trip.title(),
                trip.destination(),
                trip.startDate().toString(),
                trip.endDate().toString(),
                trip.status(clock.instant()).wireValue(),
                userRef(trip.publisherId()));
    }

    private AdminReportMessageResponse message(ChatMessage message) {
        return new AdminReportMessageResponse(
                message.id(),
                userRef(message.senderId()),
                userRef(message.receiverId()),
                message.content(),
                message.sentAt().toString());
    }

    private AdminUserRef userRef(long userId) {
        UserEntity entity = demoUserService.getById(userId);
        return new AdminUserRef(userId, entity == null ? null : entity.getNickname());
    }

    private AdminUserRef reporter(Report report) {
        UserEntity reporter = demoUserService.getById(report.reporterId());
        return new AdminUserRef(report.reporterId(), reporter == null ? null : reporter.getNickname());
    }

    private ReportedUserResponse reportedUser(Long reportedUserId, UserCredit credit) {
        if (reportedUserId == null) {
            return null;
        }
        UserEntity entity = demoUserService.getById(reportedUserId);
        if (entity == null) {
            return null;
        }
        AccountStatusEnum status = accountStatusService.effectiveStatus(entity);
        return new ReportedUserResponse(
                entity.getId(),
                entity.getNickname(),
                status.code(),
                credit == null ? null : credit.score(),
                credit == null ? null : credit.levelCode());
    }

    private AdminUserRef processedBy(Report report) {
        if (report.processedBy() == null) {
            return null;
        }
        UserEntity entity = demoUserService.getById(report.processedBy());
        return new AdminUserRef(report.processedBy(), entity == null ? null : entity.getNickname());
    }

    private static String requireOutcome(String raw) {
        String value = raw == null ? "" : raw.trim().toUpperCase(Locale.ROOT);
        if (!ReportStatusEnum.RESOLVED.code().equals(value) && !ReportStatusEnum.REJECTED.code().equals(value)) {
            throw new InvalidInputException("outcome must be RESOLVED or REJECTED");
        }
        return value;
    }

    public static String code(long reportId) {
        return "R-" + reportId;
    }
}