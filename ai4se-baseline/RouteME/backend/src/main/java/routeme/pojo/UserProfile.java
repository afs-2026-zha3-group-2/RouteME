package routeme.pojo;

import java.util.List;

/**
 * 个人资料的领域视图：生日只在本人读取时填值，他人读取为 null。
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
        boolean profileComplete) {
}