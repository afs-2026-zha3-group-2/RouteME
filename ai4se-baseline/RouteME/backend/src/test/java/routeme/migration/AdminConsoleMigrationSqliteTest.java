package routeme.migration;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Path;
import java.util.List;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import routeme.utils.PasswordUtils;

/**
 * Applies the whole migration chain to a temporary SQLite file and asserts that V19 adds the
 * admin console columns, the report workflow columns, both customer-service tables and the seeded
 * administrator.
 */
class AdminConsoleMigrationSqliteTest {

    @TempDir
    Path tempDirectory;

    @Test
    void in_emptySqliteFile_out_adminConsoleSchema() {
        // Given
        String databaseUrl = "jdbc:sqlite:" + toSqlitePath(tempDirectory.resolve("routeme.db"));
        Flyway.configure()
                .dataSource(databaseUrl, null, null)
                .locations("classpath:db/migration")
                .load()
                .migrate();
        JdbcClient jdbcClient = JdbcClient.create(new DriverManagerDataSource(databaseUrl));

        // When
        List<String> userColumns = jdbcClient.sql("SELECT name FROM pragma_table_info('app_users')")
                .query(String.class)
                .list();
        List<String> reportColumns = jdbcClient.sql("SELECT name FROM pragma_table_info('reports')")
                .query(String.class)
                .list();
        List<String> serviceColumns = jdbcClient.sql(
                        "SELECT name FROM pragma_table_info('customer_service_sessions')")
                .query(String.class)
                .list();
        int serviceTables = jdbcClient.sql("""
                SELECT COUNT(*) FROM sqlite_master
                 WHERE type = 'table'
                   AND name IN ('customer_service_sessions', 'customer_service_messages')
                """).query(Integer.class).single();
        int emailIndex = jdbcClient.sql("""
                SELECT COUNT(*) FROM sqlite_master
                 WHERE type = 'index' AND name = 'ux_app_users_email'
                """).query(Integer.class).single();
        String adminHash = jdbcClient.sql("SELECT password_hash FROM app_users WHERE username = 'admin'")
                .query(String.class)
                .single();
        String adminRole = jdbcClient.sql("SELECT role FROM app_users WHERE username = 'admin'")
                .query(String.class)
                .single();
        String adminStatus = jdbcClient.sql("SELECT status FROM app_users WHERE username = 'admin'")
                .query(String.class)
                .single();
        int demoUsers = jdbcClient.sql("SELECT COUNT(*) FROM app_users WHERE role = 'USER' AND status = 'ACTIVE'")
                .query(Integer.class)
                .single();
        jdbcClient.sql("""
                INSERT INTO reports (id, target_type, target_id, reporter_id, reason, note, created_at)
                VALUES (900, 'trip', 1, 1, 'safety', NULL, '2026-11-17T00:00:00Z')
                """).update();
        String reportStatus = jdbcClient.sql("SELECT status FROM reports WHERE id = 900")
                .query(String.class)
                .single();
        int v19Applied = jdbcClient.sql(
                        "SELECT COUNT(*) FROM flyway_schema_history WHERE version = '19' AND success = 1")
                .query(Integer.class)
                .single();
        int v22Applied = jdbcClient.sql(
                        "SELECT COUNT(*) FROM flyway_schema_history WHERE version = '22' AND success = 1")
                .query(Integer.class)
                .single();
        int v30Applied = jdbcClient.sql(
                        "SELECT COUNT(*) FROM flyway_schema_history WHERE version = '30' AND success = 1")
                .query(Integer.class)
                .single();

        // Then
        assertAll(
                () -> assertTrue(
                        userColumns.containsAll(List.of(
                                "email", "role", "status", "status_reason", "status_updated_at",
                                "status_updated_by", "ban_expires_at", "ban_reason_code", "ban_reason_note")),
                        "V19 adds account status columns"),
                () -> assertTrue(
                        reportColumns.containsAll(List.of(
                                "status", "processed_by", "processing_at", "resolved_at",
                                "resolution_note", "resolution_action", "context_trip_id")),
                        "V19/V22 add report workflow and chat context columns"),
                () -> assertEquals(2, serviceTables, "customer service tables exist"),
                () -> assertTrue(
                        serviceColumns.containsAll(List.of("resolved_at", "resolved_by")),
                        "V30 adds resolve audit columns"),
                () -> assertEquals(1, emailIndex, "email uniqueness index exists"),
                () -> assertTrue(
                        PasswordUtils.matches("admin12345", adminHash),
                        "seeded administrator logs in with admin12345"),
                () -> assertEquals("ADMIN", adminRole, "seeded administrator role"),
                () -> assertEquals("ACTIVE", adminStatus, "seeded administrator is active"),
                () -> assertEquals(4, demoUsers, "existing demo users default to USER / ACTIVE"),
                () -> assertEquals("PENDING", reportStatus, "new reports start at PENDING"),
                () -> assertEquals(1, v19Applied, "V19 recorded in flyway history"),
                () -> assertEquals(1, v22Applied, "V22 recorded in flyway history"),
                () -> assertEquals(1, v30Applied, "V30 recorded in flyway history"));
    }

    private String toSqlitePath(Path path) {
        return path.toAbsolutePath().toString().replace('\\', '/');
    }
}