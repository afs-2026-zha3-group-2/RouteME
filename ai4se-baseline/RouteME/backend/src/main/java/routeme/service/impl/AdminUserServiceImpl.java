package routeme.service.impl;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import routeme.entity.TripExperienceEntity;
import routeme.entity.TripPlanEntity;
import routeme.entity.UserEntity;
import routeme.enums.AccountStatusEnum;
import routeme.enums.AdminStatusActionEnum;
import routeme.enums.BanReasonEnum;
import routeme.exception.CannotTargetSelfException;
import routeme.exception.InvalidInputException;
import routeme.exception.UserNotFoundException;
import routeme.model.PenaltyRules;
import routeme.param.PageParam;
import routeme.pojo.PageResult;
import routeme.pojo.Report;
import routeme.pojo.TripExperience;
import routeme.pojo.TripPlan;
import routeme.request.AdminUserStatusRequest;
import routeme.response.AdminUserDetailResponse;
import routeme.response.AdminUserExperienceRef;
import routeme.response.AdminUserRef;
import routeme.response.AdminUserReportRef;
import routeme.response.AdminUserSummaryResponse;
import routeme.response.AdminUserTripRef;
import routeme.service.AccountStatusService;
import routeme.service.AdminReportService;
import routeme.service.AdminUserService;
import routeme.service.DemoUserService;
import routeme.service.ExperienceService;
import routeme.service.ReportTargetService;
import routeme.service.TripPlanService;

/** 管理端用户查询与状态迁移实现。 */
@Service
public class AdminUserServiceImpl implements AdminUserService {

    private static final int DETAIL_LIST_LIMIT = 50;

    private final DemoUserService demoUserService;
    private final AccountStatusService accountStatusService;
    private final AdminReportService adminReportService;
    private final ReportTargetService reportTargetService;
    private final TripPlanService tripPlanService;
    private final ExperienceService experienceService;
    private final Clock clock;

    public AdminUserServiceImpl(
            DemoUserService demoUserService,
            AccountStatusService accountStatusService,
            AdminReportService adminReportService,
            ReportTargetService reportTargetService,
            TripPlanService tripPlanService,
            ExperienceService experienceService,
            Clock clock) {
        this.demoUserService = demoUserService;
        this.accountStatusService = accountStatusService;
        this.adminReportService = adminReportService;
        this.reportTargetService = reportTargetService;
        this.tripPlanService = tripPlanService;
        this.experienceService = experienceService;
        this.clock = clock;
    }

    @Override
    public PageResult<AdminUserSummaryResponse> list(String q, String status, int page, int size) {
        PageParam param = PageParam.parse(page, size);
        String keyword = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
        AccountStatusEnum filter = null;
        if (status != null && !status.isBlank()) {
            filter = AccountStatusEnum.of(status.trim().toUpperCase(Locale.ROOT));
        }
        final AccountStatusEnum statusFilter = filter;
        List<UserEntity> rows = demoUserService.list(Wrappers.<UserEntity>lambdaQuery()
                .orderByDesc(UserEntity::getCreatedAt)
                .orderByDesc(UserEntity::getId));
        List<AdminUserSummaryResponse> filtered = rows.stream()
                .map(this::summary)
                .filter(row -> statusFilter == null || statusFilter.code().equals(row.status()))
                .filter(row -> matches(row, keyword))
                .toList();
        return new PageResult<>(param.slice(filtered), param.page(), param.size(), filtered.size());
    }

    @Override
    public AdminUserDetailResponse detail(long userId) {
        UserEntity entity = requireEntity(userId);
        List<TripPlan> trips = tripPlanService.list(Wrappers.<TripPlanEntity>lambdaQuery()
                        .eq(TripPlanEntity::getPublisherId, userId)
                        .orderByDesc(TripPlanEntity::getCreatedAt)
                        .orderByDesc(TripPlanEntity::getId))
                .stream()
                .map(TripPlanEntity::toTripPlan)
                .toList();
        List<TripExperience> experiences = experienceService.list(Wrappers.<TripExperienceEntity>lambdaQuery()
                        .eq(TripExperienceEntity::getAuthorId, userId)
                        .orderByDesc(TripExperienceEntity::getCreatedAt)
                        .orderByDesc(TripExperienceEntity::getId))
                .stream()
                .map(TripExperienceEntity::toExperience)
                .toList();
        List<AdminUserReportRef> reports = reportRefs(userId);
        AccountStatusEnum effective = accountStatusService.effectiveStatus(entity);
        boolean banned = effective == AccountStatusEnum.BANNED;

        return new AdminUserDetailResponse(
                entity.getId(),
                entity.getNickname(),
                entity.getAvatarInitial(),
                entity.getAvatarUrl(),
                entity.getEmail(),
                entity.getRole(),
                effective.code(),
                entity.getCreatedAt(),
                entity.getSchool(),
                entity.getCity(),
                entity.getMajor(),
                entity.getJob(),
                entity.getBio(),
                routeme.utils.JsonListUtils.parse(entity.getInterests()),
                entity.getStatusReason(),
                entity.getStatusUpdatedAt(),
                statusUpdatedBy(entity.getStatusUpdatedBy()),
                banned ? entity.getBanExpiresAt() : null,
                banned ? entity.getBanReasonCode() : null,
                banned ? entity.getBanReasonNote() : null,
                trips.stream().limit(DETAIL_LIST_LIMIT).map(this::tripRef).toList(),
                experiences.stream().limit(DETAIL_LIST_LIMIT).map(this::experienceRef).toList(),
                reports,
                trips.size(),
                experiences.size(),
                adminReportService.findAll().stream().filter(report -> involved(report, userId)).count());
    }

    @Override
    @Transactional
    public AdminUserDetailResponse changeStatus(long userId, long adminId, AdminUserStatusRequest request) {
        if (request == null) {
            throw new InvalidInputException("status change body is required");
        }
        AdminStatusActionEnum action = AdminStatusActionEnum.of(requireAction(request.action()));
        if (action != AdminStatusActionEnum.RESTORE && userId == adminId) {
            throw new CannotTargetSelfException(adminId);
        }
        switch (action) {
            case SUSPEND -> {
                String reason = PenaltyRules.requireText(
                        request.reason(), "reason", PenaltyRules.MAX_REASON_LENGTH);
                accountStatusService.suspend(userId, adminId, reason, false);
            }
            case BAN -> {
                String reason = PenaltyRules.requireText(
                        request.reason(), "reason", PenaltyRules.MAX_REASON_LENGTH);
                BanReasonEnum banReason = PenaltyRules.requireBanReason(request.banReasonCode());
                String banNote = PenaltyRules.optionalText(
                        request.banReasonNote(), "ban_reason_note", PenaltyRules.MAX_BAN_NOTE_LENGTH);
                PenaltyRules.requireNoteForOther(banReason, banNote);
                Instant expiresAt = PenaltyRules.requireFutureExpiry(request.banExpiresAt(), clock);
                accountStatusService.ban(userId, adminId, reason, banReason, banNote, expiresAt);
            }
            case RESTORE -> {
                String reason = PenaltyRules.optionalText(
                        request.reason(), "reason", PenaltyRules.MAX_REASON_LENGTH);
                accountStatusService.restore(userId, adminId, reason);
            }
        }
        return detail(userId);
    }

    private List<AdminUserReportRef> reportRefs(long userId) {
        return adminReportService.findAll().stream()
                .filter(report -> involved(report, userId))
                .limit(DETAIL_LIST_LIMIT)
                .map(report -> new AdminUserReportRef(
                        report.id(),
                        AdminReportServiceImpl.code(report.id()),
                        report.reporterId() == userId ? "REPORTER" : "REPORTED",
                        report.status(),
                        report.reason(),
                        report.createdAt().toString()))
                .toList();
    }

    private boolean involved(Report report, long userId) {
        return report.reporterId() == userId
                || Objects.equals(reportTargetService.reportedUserId(report), userId);
    }

    private AdminUserSummaryResponse summary(UserEntity entity) {
        return new AdminUserSummaryResponse(
                entity.getId(),
                entity.getNickname(),
                entity.getAvatarInitial(),
                entity.getAvatarUrl(),
                entity.getEmail(),
                entity.getRole(),
                accountStatusService.effectiveStatus(entity).code(),
                entity.getCreatedAt());
    }

    private boolean matches(AdminUserSummaryResponse row, String keyword) {
        if (keyword.isEmpty()) {
            return true;
        }
        if (isNumeric(keyword) && Long.parseLong(keyword) == row.id()) {
            return true;
        }
        if (row.nickname() != null && row.nickname().toLowerCase(Locale.ROOT).contains(keyword)) {
            return true;
        }
        return row.email() != null && row.email().toLowerCase(Locale.ROOT).contains(keyword);
    }

    private AdminUserTripRef tripRef(TripPlan trip) {
        return new AdminUserTripRef(
                trip.id(),
                trip.title(),
                trip.status(clock.instant()).wireValue(),
                trip.startDate().toString());
    }

    private AdminUserExperienceRef experienceRef(TripExperience experience) {
        TripPlanEntity trip = tripPlanService.getById(experience.tripId());
        return new AdminUserExperienceRef(
                experience.id(),
                experience.tripId(),
                trip == null ? null : trip.toTripPlan().title(),
                experience.createdAt().toString());
    }

    private AdminUserRef statusUpdatedBy(Long adminId) {
        if (adminId == null) {
            return null;
        }
        UserEntity admin = demoUserService.getById(adminId);
        return new AdminUserRef(adminId, admin == null ? null : admin.getNickname());
    }

    private UserEntity requireEntity(long userId) {
        UserEntity entity = demoUserService.getById(userId);
        if (entity == null) {
            throw new UserNotFoundException(userId);
        }
        return entity;
    }

    private static String requireAction(String raw) {
        String value = raw == null ? "" : raw.trim().toUpperCase(Locale.ROOT);
        return AdminStatusActionEnum.of(value).code();
    }

    private static boolean isNumeric(String value) {
        if (value.isEmpty()) {
            return false;
        }
        for (int i = 0; i < value.length(); i++) {
            if (!Character.isDigit(value.charAt(i))) {
                return false;
            }
        }
        return true;
    }
}