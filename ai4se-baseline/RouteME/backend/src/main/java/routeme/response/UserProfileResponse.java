package routeme.response;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

import routeme.pojo.UserProfile;

/**
 * 用户资料响应：在既有资料字段之外补充只读的账号状态与封禁信息。
 * 封禁字段只在有效状态为 {@code BANNED} 时下发；{@code status_reason} 与
 * {@code ban_reason_note} 属管理员内部信息，永不出现在用户侧响应中。
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record UserProfileResponse(
        long id,
        String nickname,
        String avatarInitial,
        String avatarUrl,
        String birthday,
        Integer age,
        String zodiac,
        String gender,
        String city,
        String school,
        String major,
        String job,
        String mbti,
        List<String> interests,
        String travelStyle,
        String bio,
        boolean profileComplete,
        int creditScore,
        String creditLevel,
        String joinedAt,
        ProfileStatsResponse stats,
        String status,
        String banReasonCode,
        String banExpiresAt) {

    public static UserProfileResponse from(UserProfile profile, boolean includeBirthday) {
        return from(profile, includeBirthday, null, null);
    }

    public static UserProfileResponse from(
            UserProfile profile,
            boolean includeBirthday,
            String joinedAt,
            ProfileStatsResponse stats) {
        return new UserProfileResponse(
                profile.id(),
                profile.nickname(),
                profile.avatarInitial(),
                profile.avatarUrl(),
                includeBirthday ? profile.birthday() : null,
                profile.age(),
                profile.zodiac(),
                profile.gender(),
                profile.city(),
                profile.school(),
                profile.major(),
                profile.job(),
                profile.mbti(),
                profile.interests(),
                profile.travelStyle(),
                profile.bio(),
                profile.profileComplete(),
                profile.creditScore(),
                profile.creditLevel().wireValue(),
                joinedAt,
                stats,
                profile.status(),
                profile.banReasonCode(),
                profile.banExpiresAt());
    }
}