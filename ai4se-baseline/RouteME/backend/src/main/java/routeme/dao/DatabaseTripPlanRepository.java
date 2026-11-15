package routeme.dao;

import java.time.Instant;
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

        @Override
        public long nextId() {
            return jdbcClient.sql("SELECT COALESCE(MAX(id), 0) + 1 FROM trip_plans")
                    .query(Long.class)
                    .single();
        }

        @Override
        public void insert(TripPlan trip) {
            jdbcClient.sql("""
                            INSERT INTO trip_plans (id, publisher_id, title, destination, start_date, end_date, stops,
                                                    meeting_area, note, budget_min_cents, budget_max_cents, tags,
                                                    capacity, joined_count, completed_at, created_at, updated_at)
                            VALUES (:id, :publisherId, :title, :destination, :startDate, :endDate, :stops,
                                    :meetingArea, :note, :budgetMinCents, :budgetMaxCents, :tags,
                                    :capacity, :joinedCount, :completedAt, :createdAt, :updatedAt)
                            """)
                    .param("id", trip.id())
                    .param("publisherId", trip.publisherId())
                    .param("title", trip.title())
                    .param("destination", trip.destination())
                    .param("startDate", trip.startDate().toString())
                    .param("endDate", trip.endDate().toString())
                    .param("stops", toJson(trip.stops()))
                    .param("meetingArea", trip.meetingArea())
                    .param("note", trip.note())
                    .param("budgetMinCents", trip.budgetMinCents())
                    .param("budgetMaxCents", trip.budgetMaxCents())
                    .param("tags", toJson(trip.tags()))
                    .param("capacity", trip.capacity())
                    .param("joinedCount", trip.joinedCount())
                    .param("completedAt", trip.completedAt() == null ? null : trip.completedAt().toString())
                    .param("createdAt", trip.createdAt().toString())
                    .param("updatedAt", trip.updatedAt().toString())
                    .update();
        }

        private String toJson(List<String> values) {
            return JsonListCodec.write(values);
        }

        @Override
        public void markCompleted(long id, Instant completedAt) {
            jdbcClient.sql("UPDATE trip_plans SET completed_at = :completedAt, updated_at = :completedAt WHERE id = :id")
                    .param("completedAt", completedAt.toString())
                    .param("id", id)
                    .update();
        }
    }