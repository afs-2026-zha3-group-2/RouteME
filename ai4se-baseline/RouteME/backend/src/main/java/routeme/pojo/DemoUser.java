package routeme.pojo;

import java.util.List;

/**
 * User summary rendered by the front end. {@code studentVerified} is the write gate for core
 * actions; {@code role} and {@code status} are read-only and always come from {@code app_users};
 * clients never supply them.
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
        boolean profileComplete,
        boolean studentVerified,
        String role,
        String status) {
}