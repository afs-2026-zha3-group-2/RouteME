package routeme.service;

import routeme.response.UserProfileResponse;

/**
 * 公开资料：只读聚合，不拥有表；统计口径见 user-profiles 规格。
 */
public interface UserProfileService {

    /**
     * 按用户 id 读取公开资料与四项统计。
     *
     * @param userId 用户 id
     * @return 公开字段与统计
     * @throws routeme.exception.UserNotFoundException 用户不存在
     */
    UserProfileResponse byUserId(long userId);
}
