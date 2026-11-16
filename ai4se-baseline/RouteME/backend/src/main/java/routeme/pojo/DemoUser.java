package routeme.pojo;

import java.util.List;

/**
 * 用户公开摘要：身份门、发布者与体验作者共用；资料完善状态由必填字段派生。
 */
public record DemoUser(
        long id,
        String nickname,
        String avatarInitial,
        String avatarUrl,
        String school,
        String city,
        String major,
        String job,
        String bio,
        List<String> interests,
        boolean profileComplete) {
}