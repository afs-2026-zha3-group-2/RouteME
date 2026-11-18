package routeme.pojo;

import java.util.List;

import routeme.enums.CreditLevel;

/**
 * 个人资料的领域视图：生日只在本人读取时填值，他人读取为 null；信用分与等级任意视角均填值。
 * 封禁信息只在有效状态为 BANNED 时下发，以有效状态为开关。
 */
public record UserProfile(
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
        CreditLevel creditLevel,
        boolean creditRestricted,
        String creditRestrictionReason,
        String status,
        String banReasonCode,
        String banExpiresAt) {
}