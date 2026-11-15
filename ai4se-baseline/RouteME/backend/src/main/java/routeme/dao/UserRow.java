package routeme.dao;

import java.sql.ResultSet;
import java.sql.SQLException;
import routeme.model.DemoUser;

/**
 * app_users 行对象：JSON 列表在这里解析，不向上泄漏。
 */
record UserRow(
        long id,
        String nickname,
        String avatarInitial,
        String school,
        String bio,
        String interestsJson) {

    static UserRow from(ResultSet resultSet) throws SQLException {
        return new UserRow(
                resultSet.getLong("id"),
                resultSet.getString("nickname"),
                resultSet.getString("avatar_initial"),
                resultSet.getString("school"),
                resultSet.getString("bio"),
                resultSet.getString("interests"));
    }

    DemoUser toDemoUser() {
        return new DemoUser(id, nickname, avatarInitial, school, bio, JsonListCodec.parse(interestsJson));
    }
}