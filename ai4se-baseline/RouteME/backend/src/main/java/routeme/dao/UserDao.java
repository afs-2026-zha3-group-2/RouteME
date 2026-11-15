package routeme.dao;

import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import routeme.entity.UserEntity;
import routeme.model.DemoUser;
import routeme.repository.UserRepository;

@Repository
public class UserDao implements UserRepository {

    private static final String SELECT_USER =
            "SELECT id, nickname, avatar_initial, school, bio, interests FROM app_users";

    private final JdbcClient jdbcClient;

    public UserDao(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    public List<DemoUser> findAll() {
        return jdbcClient.sql(SELECT_USER + " ORDER BY id")
                .query((resultSet, rowNumber) -> UserEntity.from(resultSet).toDemoUser())
                .list();
    }

    @Override
    public Optional<DemoUser> findById(long id) {
        return jdbcClient.sql(SELECT_USER + " WHERE id = :id")
                .param("id", id)
                .query((resultSet, rowNumber) -> UserEntity.from(resultSet).toDemoUser())
                .optional();
    }
}