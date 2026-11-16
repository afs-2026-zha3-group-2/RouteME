package routeme.request;

/**
 * 注册请求：只收窄为用户名、密码与昵称；旧版资料字段（学校 / 简介 / 兴趣 / 头像首字）被忽略。
 */
public record AuthRegisterRequest(
        String username,
        String password,
        String nickname) {
}