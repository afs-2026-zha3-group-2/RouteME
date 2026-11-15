package routeme.dao;

import java.util.Optional;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import routeme.entity.GreetingEntity;
import routeme.model.Greeting;
import routeme.repository.GreetingRepository;

@Repository
public class GreetingDao implements GreetingRepository {

    private final JdbcClient jdbcClient;

    public GreetingDao(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    public Optional<Greeting> findGreeting() {
        return jdbcClient.sql("SELECT id, message FROM greetings ORDER BY id LIMIT 1")
                .query((resultSet, rowNumber) ->
                        new GreetingEntity(resultSet.getLong("id"), resultSet.getString("message")))
                .optional()
                .map(GreetingEntity::toGreeting);
    }
}
