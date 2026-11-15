package routeme.dao;

import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import routeme.model.TripPlan;

@Repository
public class DatabaseTripPlanRepository implements TripPlanRepository {

    private static final String SELECT_TRIP =
            """
            SELECT id, publisher_id, title, destination, start_date, end_date, stops, meeting_area, note,
                   budget_min_cents, budget_max_cents, tags, capacity, joined_count, completed_at,
                   created_at, updated_at
              FROM trip_plans
            """;

    private final JdbcClient jdbcClient;

    public DatabaseTripPlanRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    public List<TripPlan> findUnfinished() {
        return jdbcClient.sql(SELECT_TRIP + " WHERE completed_at IS NULL ORDER BY start_date, created_at DESC")
                .query((resultSet, rowNumber) -> TripPlanRow.from(resultSet).toTripPlan())
                .list();
    }

    @Override
    public Optional<TripPlan> findById(long id) {
        return jdbcClient.sql(SELECT_TRIP + " WHERE id = :id")
                .param("id", id)
                .query((resultSet, rowNumber) -> TripPlanRow.from(resultSet).toTripPlan())
                .optional();
    }
}