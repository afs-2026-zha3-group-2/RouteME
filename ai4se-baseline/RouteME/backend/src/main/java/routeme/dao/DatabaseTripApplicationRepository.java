package routeme.dao;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import routeme.model.ApplicationStatus;
import routeme.model.TripApplication;

@Repository
public class DatabaseTripApplicationRepository implements TripApplicationRepository {

    private static final String SELECT_APPLICATION =
            """
            SELECT id, trip_id, applicant_id, message, status, created_at, decided_at
              FROM trip_applications
            """;

    private final JdbcClient jdbcClient;

    public DatabaseTripApplicationRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    public List<TripApplication> findByTrip(long tripId) {
        return jdbcClient.sql(SELECT_APPLICATION + " WHERE trip_id = :tripId ORDER BY created_at, id")
                .param("tripId", tripId)
                .query((resultSet, rowNumber) -> TripApplicationRow.from(resultSet).toApplication())
                .list();
    }

    @Override
    public List<TripApplication> findByApplicant(long applicantId) {
        return jdbcClient.sql(SELECT_APPLICATION + " WHERE applicant_id = :applicantId ORDER BY created_at DESC, id DESC")
                .param("applicantId", applicantId)
                .query((resultSet, rowNumber) -> TripApplicationRow.from(resultSet).toApplication())
                .list();
    }

    @Override
    public Optional<TripApplication> findById(long id) {
        return jdbcClient.sql(SELECT_APPLICATION + " WHERE id = :id")
                .param("id", id)
                .query((resultSet, rowNumber) -> TripApplicationRow.from(resultSet).toApplication())
                .optional();
    }

    @Override
    public Optional<TripApplication> findAccepted(long tripId, long applicantId) {
        return jdbcClient.sql(SELECT_APPLICATION
                        + " WHERE trip_id = :tripId AND applicant_id = :applicantId AND status = 'ACCEPTED'")
                .param("tripId", tripId)
                .param("applicantId", applicantId)
                .query((resultSet, rowNumber) -> TripApplicationRow.from(resultSet).toApplication())
                .optional();
    }

    @Override
    public boolean existsActive(long tripId, long applicantId) {
        Integer count = jdbcClient.sql("""
                        SELECT COUNT(*) FROM trip_applications
                         WHERE trip_id = :tripId AND applicant_id = :applicantId
                           AND status IN ('PENDING', 'ACCEPTED')
                        """)
                .param("tripId", tripId)
                .param("applicantId", applicantId)
                .query(Integer.class)
                .single();
        return count != null && count > 0;
    }

    @Override
    public long nextId() {
        return jdbcClient.sql("SELECT COALESCE(MAX(id), 0) + 1 FROM trip_applications")
                .query(Long.class)
                .single();
    }

    @Override
    public void insert(TripApplication application) {
        jdbcClient.sql("""
                        INSERT INTO trip_applications (id, trip_id, applicant_id, message, status, created_at, decided_at)
                        VALUES (:id, :tripId, :applicantId, :message, :status, :createdAt, :decidedAt)
                        """)
                .param("id", application.id())
                .param("tripId", application.tripId())
                .param("applicantId", application.applicantId())
                .param("message", application.message())
                .param("status", application.status().name())
                .param("createdAt", application.createdAt().toString())
                .param("decidedAt", application.decidedAt() == null ? null : application.decidedAt().toString())
                .update();
    }

    @Override
    public void updateStatus(long id, ApplicationStatus status, Instant decidedAt) {
        jdbcClient.sql("UPDATE trip_applications SET status = :status, decided_at = :decidedAt WHERE id = :id")
                .param("status", status.name())
                .param("decidedAt", decidedAt == null ? null : decidedAt.toString())
                .param("id", id)
                .update();
    }
}