package routeme.migration;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Path;
import java.util.List;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

/**
 * Verifies V41 adds trip_route_completions on SQLite: declaration columns,
 * the (trip_id, user_id) unique index and the user_id lookup index, on both a
 * fresh database and an upgrade from V40. One declaration per trip per user.
 */
class TripRouteCompletionMigrationSqliteTest {

    @TempDir
    Path tempDirectory;

    @Test
    void in_freshDatabase_out_completionTableWithIndexes() {
        // Given
        String databaseUrl = jdbcUrl("fresh.db");
        migrate(databaseUrl, null);
        JdbcClient jdbcClient = JdbcClient.create(new DriverManagerDataSource(databaseUrl));

        // When
        List<String> columns = columns(jdbcClient);
        int uniqueIndex = indexCount(jdbcClient, "uk_trip_route_completions_trip_user");
        int userIndex = indexCount(jdbcClient, "idx_trip_route_completions_user");
        int v41Applied = jdbcClient.sql(
                        "SELECT COUNT(*) FROM flyway_schema_history WHERE version = '41' AND success = 1")
                .query(Integer.class)
                .single();

        // Then
        assertAll(
                () -> assertTrue(
                        columns.containsAll(List.of(
                                "id", "trip_id", "user_id", "completed_stop_indexes",
                                "planned_stop_count", "created_at")),
                        "V41 creates declaration columns: " + columns),
                () -> assertEquals(1, uniqueIndex, "(trip_id, user_id) unique index exists"),
                () -> assertEquals(1, userIndex, "user_id lookup index exists"),
                () -> assertEquals(1, v41Applied, "V41 recorded in flyway history"));
    }

    @Test
    void in_databaseAtV40_out_completionTableOnUpgrade() {
        // Given：先停在 V40，再升级到最新。
        String databaseUrl = jdbcUrl("upgrade.db");
        migrate(databaseUrl, "40");
        JdbcClient jdbcClient = JdbcClient.create(new DriverManagerDataSource(databaseUrl));
        assertEquals(0, tableCount(jdbcClient), "no completion table before V41");

        // When
        migrate(databaseUrl, null);

        // Then
        assertAll(
                () -> assertEquals(1, tableCount(jdbcClient), "upgrade creates the completion table"),
                () -> assertEquals(1, indexCount(jdbcClient, "uk_trip_route_completions_trip_user"),
                        "upgrade creates the unique index"),
                () -> assertTrue(
                        columns(jdbcClient).containsAll(List.of("completed_stop_indexes", "planned_stop_count")),
                        "upgrade creates declaration columns"));
    }

    @Test
    void in_duplicateTripUserDeclaration_out_uniqueConstraintRejects() {
        // Given
        String databaseUrl = jdbcUrl("unique.db");
        migrate(databaseUrl, null);
        JdbcClient jdbcClient = JdbcClient.create(new DriverManagerDataSource(databaseUrl));
        insertDeclaration(jdbcClient, 1, 3, 2);

        // When / Then：同一行程同一用户只能有一条声明（SQLite 驱动无错误码翻译，断言根因）。
        DataAccessException exception = assertThrows(
                DataAccessException.class, () -> insertDeclaration(jdbcClient, 2, 3, 2));
        assertTrue(String.valueOf(exception.getRootCause()).contains("UNIQUE constraint failed"),
                "unique index rejects the second declaration: " + exception.getRootCause());
    }

    private void insertDeclaration(JdbcClient jdbcClient, long id, long tripId, long userId) {
        jdbcClient.sql("""
                INSERT INTO trip_route_completions
                    (id, trip_id, user_id, completed_stop_indexes, planned_stop_count, created_at)
                VALUES
                    (:id, :tripId, :userId, '[0]', 2, '2026-11-16T09:00:00Z')
                """)
                .param("id", id)
                .param("tripId", tripId)
                .param("userId", userId)
                .update();
    }

    private String jdbcUrl(String fileName) {
        String path = tempDirectory.resolve(fileName).toAbsolutePath().toString().replace('\\', '/');
        return "jdbc:sqlite:" + path;
    }

    private List<String> columns(JdbcClient jdbcClient) {
        return jdbcClient.sql("SELECT name FROM pragma_table_info('trip_route_completions')")
                .query(String.class)
                .list();
    }

    private int tableCount(JdbcClient jdbcClient) {
        return jdbcClient.sql(
                        "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'trip_route_completions'")
                .query(Integer.class)
                .single();
    }

    private int indexCount(JdbcClient jdbcClient, String name) {
        return jdbcClient.sql("SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND name = :name")
                .param("name", name)
                .query(Integer.class)
                .single();
    }

    /**
     * @param targetVersion {@code null} 表示迁移到最新版本
     */
    private void migrate(String jdbcUrl, String targetVersion) {
        var configuration = Flyway.configure()
                .dataSource(jdbcUrl, null, null)
                .locations("classpath:db/migration");
        if (targetVersion != null) {
            configuration.target(targetVersion);
        }
        configuration.load().migrate();
    }
}