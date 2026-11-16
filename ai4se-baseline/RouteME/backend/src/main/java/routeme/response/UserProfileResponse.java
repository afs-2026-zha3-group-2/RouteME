package routeme.response;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

import routeme.pojo.UserProfile;

/**
 * 资料响应：可空字段直接省略；生日只在本人响应中出现。
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
        boolean profileComplete) {

    public static UserProfileResponse from(UserProfile profile, boolean includeBirthday) {
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
                profile.profileComplete());
    }
}