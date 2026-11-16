package routeme.request;

import java.util.List;

/**
 * 资料保存请求：字段与契约 UserProfileUpdateRequest 一一对应。
 */
public record UserProfileUpdateRequest(
        String nickname,
        String birthday,
        String gender,
        String city,
        String school,
        String major,
        String job,
        String mbti,
        List<String> interests,
        String travelStyle,
        String bio) {
}