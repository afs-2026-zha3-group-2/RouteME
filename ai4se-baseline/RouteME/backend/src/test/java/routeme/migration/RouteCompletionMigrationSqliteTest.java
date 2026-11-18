package routeme.migration;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Path;
import java.util.List;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

/**
 * 路线完成度的反向迁移约束：本变更零表零迁移。
 *
 * <p>锁住三件事：{@code V31} 仍是本变更落库时的迁移头；{@code app_users} 与
 * {@code trip_plans} 都没有新增完成度列；库内不存在 {@code route_completion*}
 * 表 / 索引 / 视图。未来聚合上线时删掉本测试即为设计变更信号。
 */
class RouteCompletionMigrationSqliteTest {

    @TempDir
    Path tempDirectory;

    @Test
    void in_emptySqliteFile_out_noCompletionSchema() {
        // Given
        String jdbcUrl = jdbcUrl("fresh.db");
        migrate(jdbcUrl, null);
        JdbcClient jdbcClient = JdbcClient.create(new DriverManagerDataSource(jdbcUrl));

        // When
        int version31 = jdbcClient.sql("""
                SELECT COUNT(*) FROM flyway_schema_history
                 WHERE success = 1 AND version = '31'
                """).query(Integer.class).single();
        int completionObjects = objectCount(jdbcClient, "route_completion%");
        List<String> userColumns = columns(jdbcClient, "app_users");
        List<String> tripColumns = columns(jdbcClient, "trip_plans");

        // Then
        assertAll(
                () -> assertEquals(1, version31, "V31 stays the migration head of this change"),
                () -> assertEquals(0, completionObjects, "no route_completion* table, index or view"),
                () -> assertTrue(
                        userColumns.stream().noneMatch(column -> column.contains("route_completion")),
                        "app_users has no completion columns: " + userColumns),
                () -> assertTrue(
                        tripColumns.stream().noneMatch(column -> column.contains("completion")),
                        "trip_plans has no completion columns: " + tripColumns));
    }

    @Test
    void in_databaseBeforeV31_out_noCompletionSchemaOnUpgrade() {
        // Given：先停在 V30，再升级到最新。
        String jdbcUrl = jdbcUrl("upgrade.db");
        migrate(jdbcUrl, "30");

        // When
        migrate(jdbcUrl, null);
        JdbcClient jdbcClient = JdbcClient.create(new DriverManagerDataSource(jdbcUrl));

        // Then
        assertAll(
                () -> assertEquals(0, objectCount(jdbcClient, "route_completion%"),
                        "upgrade creates no route_completion* objects"),
                () -> assertTrue(
                        columns(jdbcClient, "app_users").stream().noneMatch(column -> column.contains("route_completion")),
                        "upgrade adds no completion columns"));
    }

    private String jdbcUrl(String fileName) {
        String path = tempDirectory.resolve(fileName).toAbsolutePath().toString().replace('\\', '/');
        return "jdbc:sqlite:" + path;
    }

    private int objectCount(JdbcClient jdbcClient, String namePattern) {
        return jdbcClient.sql("SELECT COUNT(*) FROM sqlite_master WHERE name LIKE :pattern")
                .param("pattern", namePattern)
                .query(Integer.class)
                .single();
    }

    private List<String> columns(JdbcClient jdbcClient, String table) {
        return jdbcClient.sql("PRAGMA table_info(" + table + ")")
                .query((rs, rowNum) -> rs.getString("name"))
                .list();
    }

    /**
     * @param targetVersion {@code null} 表示迁移到最新版本
     */
    private void migrate(String jdbcUrl, String targetVersion) {
        var configuration = Flyway.configure()
                .dataSource(jdbcUrl, null, null)
                .locations("classpath:db/migration");
        if (targetVersion != null) {
            configuration.target(MigrationVersion.fromVersion(targetVersion));
        }
        configuration.load().migrate();
    }
}
