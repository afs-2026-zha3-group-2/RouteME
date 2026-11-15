package routeme.model;

import java.util.List;

/**
 * 演示账户：MVP 没有注册与鉴权，身份由 X-User-Id 指定。
 */
public record DemoUser(
        long id,
        String nickname,
        String avatarInitial,
        String school,
        String bio,
        List<String> interests) {
}