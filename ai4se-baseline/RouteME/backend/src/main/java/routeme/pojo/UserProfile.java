package routeme.pojo;

import java.util.List;

/**
 * 用户资料读模型：只包含可公开字段，封禁信息以有效状态为开关。
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
        String status,
        String banReasonCode,
        String banExpiresAt) {
}