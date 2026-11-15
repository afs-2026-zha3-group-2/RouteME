package routeme.dao;

import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import routeme.entity.TripExperienceEntity;
import routeme.model.TripExperience;
import routeme.repository.TripExperienceRepository;

@Repository
public class TripExperienceDao implements TripExperienceRepository {

    private static final String SELECT_EXPERIENCE =
            """
            SELECT id, trip_id, author_id, content, intensity, advice, created_at, updated_at
              FROM trip_experiences
            """;

    private final JdbcClient jdbcClient;

    public TripExperienceDao(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    public List<TripExperience> findAll() {
        return jdbcClient.sql(SELECT_EXPERIENCE + " ORDER BY updated_at DESC, id DESC")
                .query((resultSet, rowNumber) -> TripExperienceEntity.from(resultSet).toExperience())
                .list();
    }

    @Override
    public List<TripExperience> findByTrip(long tripId) {
        return jdbcClient.sql(SELECT_EXPERIENCE + " WHERE trip_id = :tripId ORDER BY created_at, id")
                .param("tripId", tripId)
                .query((resultSet, rowNumber) -> TripExperienceEntity.from(resultSet).toExperience())
                .list();
    }

    @Override
    public List<TripExperience> findByAuthor(long authorId) {
        return jdbcClient.sql(SELECT_EXPERIENCE + " WHERE author_id = :authorId ORDER BY updated_at DESC, id DESC")
                .param("authorId", authorId)
                .query((resultSet, rowNumber) -> TripExperienceEntity.from(resultSet).toExperience())
                .list();
    }

    @Override
    public Optional<TripExperience> findByTripAndAuthor(long tripId, long authorId) {
        return jdbcClient.sql(SELECT_EXPERIENCE + " WHERE trip_id = :tripId AND author_id = :authorId")
                .param("tripId", tripId)
                .param("authorId", authorId)
                .query((resultSet, rowNumber) -> TripExperienceEntity.from(resultSet).toExperience())
                .optional();
    }

    @Override
    public long nextId() {
        return jdbcClient.sql("SELECT COALESCE(MAX(id), 0) + 1 FROM trip_experiences")
                .query(Long.class)
                .single();
    }

    @Override
    public void insert(TripExperience experience) {
        jdbcClient.sql("""
                        INSERT INTO trip_experiences
                            (id, trip_id, author_id, content, intensity, advice, created_at, updated_at)
                        VALUES (:id, :tripId, :authorId, :content, :intensity, :advice, :createdAt, :updatedAt)
                        """)
                .param("id", experience.id())
                .param("tripId", experience.tripId())
                .param("authorId", experience.authorId())
                .param("content", experience.content())
                .param("intensity", experience.intensity().name())
                .param("advice", experience.advice())
                .param("createdAt", experience.createdAt().toString())
                .param("updatedAt", experience.updatedAt().toString())
                .update();
    }

    @Override
    public void update(TripExperience experience) {
        jdbcClient.sql("""
                        UPDATE trip_experiences
                           SET content = :content,
                               intensity = :intensity,
                               advice = :advice,
                               updated_at = :updatedAt
                         WHERE id = :id
                        """)
                .param("content", experience.content())
                .param("intensity", experience.intensity().name())
                .param("advice", experience.advice())
                .param("updatedAt", experience.updatedAt().toString())
                .param("id", experience.id())
                .update();
    }
}