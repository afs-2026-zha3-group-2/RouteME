package routeme.dao;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.nio.file.Path;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

/**
 * 在临时 SQLite 文件库执行 V1–V8，验证体验种子、唯一约束与作者资格。
 */
class ExperienceDataMigrationSqliteTest {

    @TempDir
    Path tempDirectory;

    @Test
    void in_emptySqliteFile_out_seededExperiencesByParticipants() {
        // Given
        String databaseUrl = "jdbc:sqlite:" + toSqlitePath(tempDirectory.resolve("routeme.db"));
        Flyway.configure()
                .dataSource(databaseUrl, null, null)
                .locations("classpath:db/migration")
                .load()
                .migrate();
        JdbcClient jdbcClient = JdbcClient.create(new DriverManagerDataSource(databaseUrl));

        // When
        int experiences = count(jdbcClient, "SELECT COUNT(*) FROM trip_experiences");
        int completedTrips = count(jdbcClient, """
                SELECT COUNT(*) FROM trip_experiences e
                  JOIN trip_plans t ON t.id = e.trip_id
                 WHERE t.completed_at IS NOT NULL
                """);
        int authorsAreParticipants = count(jdbcClient, """
                SELECT COUNT(*) FROM trip_experiences e
                  JOIN trip_plans t ON t.id = e.trip_id
                 WHERE t.publisher_id = e.author_id
                    OR EXISTS (SELECT 1 FROM trip_applications a
                                WHERE a.trip_id = e.trip_id
                                  AND a.applicant_id = e.author_id
                                  AND a.status = 'ACCEPTED')
                """);

        // Then
        assertAll(
                () -> assertEquals(2, experiences, "seeded experiences"),
                () -> assertEquals(2, completedTrips, "experiences belong to completed trips"),
                () -> assertEquals(2, authorsAreParticipants, "authors participated in the trip"),
                () -> assertThrows(
                                        DataAccessException.class,
                        () -> insertDuplicate(jdbcClient),
                        "one experience per author per trip")
        );
    }

    private void insertDuplicate(JdbcClient jdbcClient) {
        jdbcClient.sql("""
                        INSERT INTO trip_experiences
                            (id, trip_id, author_id, content, intensity, advice, created_at, updated_at)
                        VALUES (99, 1, 2, '重复的体验内容至少十个字', 'RELAXED', '重复建议',
                                '2026-11-15T00:00:00Z', '2026-11-15T00:00:00Z')
                        """)
                .update();
    }

    private int count(JdbcClient jdbcClient, String sql) {
        return jdbcClient.sql(sql).query(Integer.class).single();
    }

    private String toSqlitePath(Path path) {
        return path.toAbsolutePath().toString().replace('\\', '/');
    }
}