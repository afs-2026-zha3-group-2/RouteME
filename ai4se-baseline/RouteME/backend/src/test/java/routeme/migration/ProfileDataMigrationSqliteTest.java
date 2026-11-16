package routeme.migration;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Path;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

/**
 * 在临时 SQLite 文件库执行全部迁移，验证 V12 写入第 4 个演示用户与其行程：
 * 该用户是非学生形态，且没有用户名/密码凭据。
 */
class ProfileDataMigrationSqliteTest {

    @TempDir
    Path tempDirectory;

    @Test
    void in_emptySqliteFile_out_profileViewerSeeded() {
        // Given
        String databaseUrl = "jdbc:sqlite:" + toSqlitePath(tempDirectory.resolve("routeme.db"));
        Flyway.configure()
                .dataSource(databaseUrl, null, null)
                .locations("classpath:db/migration")
                .load()
                .migrate();
        JdbcClient jdbcClient = JdbcClient.create(new DriverManagerDataSource(databaseUrl));

        // When
        int users = jdbcClient.sql("SELECT COUNT(*) FROM app_users").query(Integer.class).single();
        int trips = jdbcClient.sql("SELECT COUNT(*) FROM trip_plans").query(Integer.class).single();
        String school = jdbcClient.sql("SELECT school FROM app_users WHERE id = 4").query(String.class).single();
        String nickname = jdbcClient.sql("SELECT nickname FROM app_users WHERE id = 4").query(String.class).single();
        String interests = jdbcClient.sql("SELECT interests FROM app_users WHERE id = 4").query(String.class).single();
        String createdAt = jdbcClient.sql("SELECT created_at FROM app_users WHERE id = 4").query(String.class).single();
        int credentialless = jdbcClient
                .sql("SELECT COUNT(*) FROM app_users WHERE id = 4 AND username IS NULL AND password_hash IS NULL")
                .query(Integer.class)
                .single();
        int publisherId = jdbcClient.sql("SELECT publisher_id FROM trip_plans WHERE id = 7")
                .query(Integer.class)
                .single();
        int joinedCount = jdbcClient.sql("SELECT joined_count FROM trip_plans WHERE id = 7")
                .query(Integer.class)
                .single();
        int capacity = jdbcClient.sql("SELECT capacity FROM trip_plans WHERE id = 7")
                .query(Integer.class)
                .single();
        String completedAt = jdbcClient.sql("SELECT completed_at FROM trip_plans WHERE id = 7")
                .query(String.class)
                .optional()
                .orElse(null);

        // Then
        assertAll(
                () -> assertEquals(4, users, "four demo users"),
                () -> assertEquals(7, trips, "seeded trips"),
                () -> assertEquals("周野", nickname, "profile viewer nickname"),
                () -> assertEquals("上班族 · 互联网行业 · INFP", school, "non-student identity"),
                () -> assertTrue(interests.contains("展览"), "interests stored as JSON text"),
                () -> assertEquals("2026-03-15T09:20:00Z", createdAt, "fixed joined time"),
                () -> assertEquals(1, credentialless, "demo account has no credentials"),
                () -> assertEquals(4, publisherId, "trip belongs to the new user"),
                () -> assertEquals(1, joinedCount, "trip counts its publisher"),
                () -> assertTrue(joinedCount < capacity, "trip stays recruiting"),
                () -> assertNull(completedAt, "trip is not completed"));
    }

    private String toSqlitePath(Path path) {
        return path.toAbsolutePath().toString().replace('\\', '/');
    }
}
