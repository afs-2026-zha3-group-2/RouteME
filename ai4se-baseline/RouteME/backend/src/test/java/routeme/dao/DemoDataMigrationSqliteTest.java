package routeme.dao;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Path;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

/**
 * 用临时 SQLite 文件库执行同一组迁移，验证演示账户与行程种子数据真的写入，
 * 并验证「状态由 completed_at 与人数推导」在数据层成立。
 */
class DemoDataMigrationSqliteTest {

    @TempDir
    Path tempDirectory;

    @Test
    void in_emptySqliteFile_out_demoTripsSeeded() {
        // Given
        String databaseUrl = "jdbc:sqlite:" + toSqlitePath(tempDirectory.resolve("routeme.db"));
        Flyway.configure()
                .dataSource(databaseUrl, null, null)
                .locations("classpath:db/migration")
                .load()
                .migrate();
        JdbcClient jdbcClient = JdbcClient.create(new DriverManagerDataSource(databaseUrl));

        // When
        int users = count(jdbcClient, "SELECT COUNT(*) FROM app_users");
        int trips = count(jdbcClient, "SELECT COUNT(*) FROM trip_plans");
        int completed = count(jdbcClient, "SELECT COUNT(*) FROM trip_plans WHERE completed_at IS NOT NULL");
        int unfinished = count(jdbcClient, "SELECT COUNT(*) FROM trip_plans WHERE completed_at IS NULL");
        int full = count(jdbcClient,
                "SELECT COUNT(*) FROM trip_plans WHERE completed_at IS NULL AND joined_count >= capacity");
        String stops = jdbcClient.sql("SELECT stops FROM trip_plans WHERE id = 3")
                .query(String.class)
                .single();

        // Then
        assertAll(
                () -> assertEquals(3, users, "demo users"),
                () -> assertEquals(6, trips, "seeded trips"),
                () -> assertEquals(2, completed, "completed trips"),
                () -> assertEquals(4, unfinished, "unfinished trips"),
                () -> assertEquals(1, full, "full trips"),
                () -> assertTrue(stops.contains("情侣北路步行"), "stops are stored as JSON text")
        );
    }

    private int count(JdbcClient jdbcClient, String sql) {
        return jdbcClient.sql(sql).query(Integer.class).single();
    }

    private String toSqlitePath(Path path) {
        return path.toAbsolutePath().toString().replace('\\', '/');
    }
}