package routeme.dao;

import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import routeme.model.Greeting;

@Repository
public class DatabaseGreetingRepository implements GreetingRepository {

    private final JdbcClient jdbcClient;

    public DatabaseGreetingRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    public Optional<Greeting> findGreeting() {
        return jdbcClient.sql("SELECT id, message FROM greetings ORDER BY id LIMIT 1")
                .query((resultSet, rowNumber) ->
                        new GreetingRow(resultSet.getLong("id"), resultSet.getString("message")))
                .optional()
                .map(GreetingRow::toGreeting);
    }
}
