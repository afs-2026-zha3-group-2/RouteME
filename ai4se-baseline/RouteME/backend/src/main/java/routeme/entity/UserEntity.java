package routeme.entity;

import java.sql.ResultSet;
import java.sql.SQLException;

import routeme.model.DemoUser;
import routeme.utils.JsonListUtils;

/**
 * app_users 行对象：JSON 列表在这里解析，不向上泄漏。
 */
public record  UserEntity(
        long id,
        String nickname,
        String avatarInitial,
        String school,
        String bio,
        String interestsJson) {

    public static UserEntity from(ResultSet resultSet) throws SQLException {
        return new UserEntity(
                resultSet.getLong("id"),
                resultSet.getString("nickname"),
                resultSet.getString("avatar_initial"),
                resultSet.getString("school"),
                resultSet.getString("bio"),
                resultSet.getString("interests"));
    }

    public DemoUser toDemoUser() {
        return new DemoUser(id, nickname, avatarInitial, school, bio, JsonListUtils.parse(interestsJson));
    }
}