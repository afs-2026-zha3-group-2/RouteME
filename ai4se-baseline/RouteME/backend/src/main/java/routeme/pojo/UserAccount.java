package routeme.pojo;

import java.time.Clock;
import java.util.List;

import routeme.model.ProfileRules;

/**
 * 账号行（含凭据）的领域视图：只在认证流程内使用，不直接对外返回。
 */
public record UserAccount(
        long id,
        String username,
        String passwordHash,
        String nickname,
        String avatarInitial,
        String school,
        String bio,
        List<String> interests,
        String avatarUrl,
        String birthday,
        String gender,
        String city,
        String major,
        String job,
        String mbti,
        String travelStyle) {

    public DemoUser toDemoUser() {
        return new DemoUser(
                id, nickname, avatarInitial, avatarUrl, school, city, major, job, bio, interests,
                ProfileRules.complete(nickname, birthday, gender, city, interests, travelStyle, Clock.systemUTC()));
    }
}