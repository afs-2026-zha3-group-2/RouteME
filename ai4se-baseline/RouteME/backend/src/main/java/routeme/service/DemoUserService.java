package routeme.service;

import java.util.List;

import routeme.entity.UserEntity;
import routeme.pojo.DemoUser;
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
     * 解析请求头里的演示身份；缺失与未知都映射为 401 {@code DEMO_USER_REQUIRED}。
     *
     * @param userId 请求头 {@code X-User-Id}，可为 null
     * @return 演示账户资料
     */
    DemoUser require(Long userId);
}