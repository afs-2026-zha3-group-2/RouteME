package routeme.response;

import java.util.List;

import routeme.pojo.DemoUser;

public record DemoUserResponse(
        long id,
        String nickname,
        String avatarInitial,
        String school,
        String bio,
        List<String> interests) {

    public static DemoUserResponse from(DemoUser user) {
        return new DemoUserResponse(user.id(), user.nickname(), user.avatarInitial(), user.school(), user.bio(),
                user.interests());
    }
}