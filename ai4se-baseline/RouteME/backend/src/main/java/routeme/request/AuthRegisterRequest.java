package routeme.request;

import java.util.List;

/**
 * 注册请求。字段与契约 AuthRegisterRequest 一一对应。
 */
public record AuthRegisterRequest(
        String username,
        String password,
        String nickname,
        String avatarInitial,
        String school,
        String bio,
        List<String> interests) {
}