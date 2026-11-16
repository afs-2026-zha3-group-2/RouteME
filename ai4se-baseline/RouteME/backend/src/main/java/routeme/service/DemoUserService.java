package routeme.service;

import java.util.List;
import java.util.Optional;

import routeme.entity.UserEntity;
import routeme.pojo.DemoUser;
import routeme.pojo.UserAccount;
import com.baomidou.mybatisplus.spring.service.IService;

/**
 * 演示账户：身份门的账户列表与 {@code X-User-Id} 解析。
 */
public interface DemoUserService extends IService<UserEntity> {

    /**
     * 全部演示账户。
     *
     * @return 按 id 升序的账户列表
     */
    List<DemoUser> findAll();

    /**
     * 只返回没有用户名凭据的演示账户；注册账号不出现在身份门。
     *
     * @return 按 id 升序的演示账户
     */
    List<DemoUser> findAllDemo();

    /**
     * 解析请求头里的演示身份；缺失与未知都映射为 401 {@code DEMO_USER_REQUIRED}。
     *
     * @param userId 请求头 {@code X-User-Id}，可为 null
     * @return 演示账户资料
     */
    DemoUser require(Long userId);

    /**
     * 下一个用户 id。
     *
     * @return 现有最大 id + 1；空表返回 1
     */
    long nextUserId();

    /**
     * 按用户名（小写规范化后）查找账号凭据。
     *
     * @param username 已规范化的用户名
     * @return 账号行；不存在时为空
     */
    Optional<UserAccount> findByUsername(String username);

    /**
     * 创建带凭据的账号：只写用户名、散列、昵称与首字；资料列写入空值，等待完善页补全。
     *
     * @param username      小写规范化后的用户名
     * @param passwordHash  PBKDF2 散列
     * @param nickname      昵称
     * @param avatarInitial 头像首字
     * @return 新建账号的公开资料
     */
    DemoUser createAccount(
            String username,
            String passwordHash,
            String nickname,
            String avatarInitial);
}