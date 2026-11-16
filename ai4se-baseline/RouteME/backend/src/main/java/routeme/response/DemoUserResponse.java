package routeme.response;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

import routeme.pojo.DemoUser;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record DemoUserResponse(
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

    public static DemoUserResponse from(DemoUser user) {
        return new DemoUserResponse(
                user.id(),
                user.nickname(),
                user.avatarInitial(),
                user.avatarUrl(),
                user.school(),
                user.city(),
                user.major(),
                user.job(),
                user.bio(),
                user.interests(),
                user.profileComplete());
    }
}