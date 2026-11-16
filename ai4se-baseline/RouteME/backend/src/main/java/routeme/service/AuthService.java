package routeme.service;

import routeme.pojo.AuthSession;
import routeme.pojo.DemoUser;
import routeme.request.AuthLoginRequest;
import routeme.request.AuthRegisterRequest;

/**
 * 账号认证：注册、登录、按 token 读取会话用户与退出。
 */
public interface AuthService {

    /**
     * 注册账号并立即签发会话。
     *
     * @param request 注册字段
     * @return 新会话
     */
    AuthSession register(AuthRegisterRequest request);

    /**
     * 用用户名与密码登录。
     *
     * @param request 登录字段
     * @return 新会话
     */
    AuthSession login(AuthLoginRequest request);

    /**
     * 按会话 token 读取当前用户；token 缺失、未知或过期时抛出 401。
     *
     * @param token Bearer token
     * @return 当前用户公开资料
     */
    DemoUser requireUser(String token);

    /**
     * 删除会话；token 不存在时保持幂等。
     *
     * @param token Bearer token
     */
    void logout(String token);
}