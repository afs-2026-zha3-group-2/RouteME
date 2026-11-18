package routeme.pojo;

import java.time.Clock;
import java.util.List;

import routeme.model.ProfileRules;

/**
 * Credentials plus profile of a registered account. Only the auth flow reads this object; it is
 * never serialised to API responses.
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
        String travelStyle,
        String email,
        String role,
        String status,
        boolean studentVerified) {

    public DemoUser toDemoUser() {
        return new DemoUser(
                id, nickname, avatarInitial, avatarUrl, school, city, major, job, bio, interests,
                ProfileRules.complete(nickname, birthday, gender, city, interests, travelStyle, Clock.systemUTC()),
                studentVerified,
                role,
                status);
    }
}