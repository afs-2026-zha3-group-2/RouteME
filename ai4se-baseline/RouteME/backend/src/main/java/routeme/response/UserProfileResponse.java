package routeme.response;

import java.util.List;

/**
 * 用户公开资料：只含白名单字段与统计，不含用户名、密码散列或会话令牌。
 */
public record UserProfileResponse(
        long id,
        String nickname,
        String avatarInitial,
        String school,
        String bio,
        List<String> interests,
        String joinedAt,
        ProfileStatsResponse stats) {
}
