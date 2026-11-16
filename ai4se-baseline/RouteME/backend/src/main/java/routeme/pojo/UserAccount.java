package routeme.pojo;

import java.util.List;

/**
 * 账号行（含凭据）的领域视图：只在认证流程内使用，不直接对外返回。
 */
public record UserAccount(
        long id,
        String username,
        String passwordHash,
        String nickname,
        String avatarInitial,
        String school,
        String bio,
        List<String> interests) {

    public DemoUser toDemoUser() {
        return new DemoUser(id, nickname, avatarInitial, school, bio, interests);
    }
}