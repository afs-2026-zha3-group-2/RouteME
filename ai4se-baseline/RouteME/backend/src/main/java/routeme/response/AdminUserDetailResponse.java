package routeme.response;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

/** 管理端用户详情（schema {@code AdminUserDetail}）。 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AdminUserDetailResponse(
        long id,
        String nickname,
        String avatarInitial,
        String avatarUrl,
        String email,
        String role,
        String status,
        String createdAt,
        String school,
        String city,
        String major,
        String job,
        String bio,
        List<String> interests,
        String statusReason,
        String statusUpdatedAt,
        AdminUserRef statusUpdatedBy,
        String banExpiresAt,
        String banReasonCode,
        String banReasonNote,
        List<AdminUserTripRef> trips,
        List<AdminUserExperienceRef> experiences,
        List<AdminUserReportRef> reports,
        long tripTotal,
        long experienceTotal,
        long reportTotal) {
}