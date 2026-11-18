package routeme.migration;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
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
 * V25：credit_exit_event / credit_restriction / trip_applications.status_reason。
 * V26：credit_exit_event.exit_note / credit_exit_attachment（合并 main 后顺延为 V28）。
 * V27：credit_exit_event.application_id（同一行程可多次退出；合并 main 后顺延为 V29）。
 * 覆盖全新库、V25 升级与 active 唯一约束。
 */
class CreditEnforcementMigrationSqliteTest {

    @TempDir
    Path tempDirectory;

    @Test
    void in_emptySqliteFile_out_creditEnforcementTablesCreated() {
        String jdbcUrl = sqliteUrl("fresh.db");
        migrate(jdbcUrl, null);
        JdbcClient jdbc = JdbcClient.create(new DriverManagerDataSource(jdbcUrl));

        int exitEvents = jdbc.sql("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'credit_exit_event'")
                .query(Integer.class).single();
        int restrictions = jdbc.sql("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'credit_restriction'")
                .query(Integer.class).single();
        int attachments = jdbc.sql("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'credit_exit_attachment'")
                .query(Integer.class).single();
        List<String> applicationColumns = jdbc.sql("SELECT name FROM pragma_table_info('trip_applications')")
                .query(String.class).list();
        List<String> eventColumns = jdbc.sql("SELECT name FROM pragma_table_info('credit_exit_event')")
                .query(String.class).list();
        int applied25 = jdbc.sql("""
                SELECT COUNT(*) FROM flyway_schema_history
                 WHERE success = 1 AND version = '25'
                """).query(Integer.class).single();
        int applied28 = jdbc.sql("""
                SELECT COUNT(*) FROM flyway_schema_history
                 WHERE success = 1 AND version = '28'
                """).query(Integer.class).single();
        int applied29 = jdbc.sql("""
                SELECT COUNT(*) FROM flyway_schema_history
                 WHERE success = 1 AND version = '29'
                """).query(Integer.class).single();

        assertAll(
                () -> assertEquals(1, exitEvents, "credit_exit_event created"),
                () -> assertEquals(1, restrictions, "credit_restriction created"),
                () -> assertEquals(1, attachments, "credit_exit_attachment created"),
                () -> assertTrue(applicationColumns.contains("status_reason"), "status_reason added"),
                () -> assertTrue(eventColumns.contains("exit_note"), "exit_note added"),
                () -> assertTrue(eventColumns.contains("application_id"), "application_id added"),
                () -> assertEquals(1, applied25, "V25 applied once"),
                () -> assertEquals(1, applied28, "V28 applied once"),
                () -> assertEquals(1, applied29, "V29 applied once"));
    }

    @Test
    void in_databaseAtV25_out_exitEvidenceAddedOnUpgrade() {
        String jdbcUrl = sqliteUrl("upgrade.db");
        migrate(jdbcUrl, "25");
        JdbcClient before = JdbcClient.create(new DriverManagerDataSource(jdbcUrl));
        int beforeTables = before.sql(
                "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'credit_exit_attachment'")
                .query(Integer.class).single();
        List<String> beforeColumns = before.sql("SELECT name FROM pragma_table_info('credit_exit_event')")
                .query(String.class).list();

        migrate(jdbcUrl, null);
        JdbcClient after = JdbcClient.create(new DriverManagerDataSource(jdbcUrl));
        int afterTables = after.sql(
                "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'credit_exit_attachment'")
                .query(Integer.class).single();
        List<String> afterColumns = after.sql("SELECT name FROM pragma_table_info('credit_exit_event')")
                .query(String.class).list();
        List<String> statusReasons = after.sql("SELECT status_reason FROM trip_applications")
                .query(String.class).list();

        assertAll(
                () -> assertEquals(0, beforeTables, "V25 has no attachment table"),
                () -> assertTrue(!beforeColumns.contains("exit_note"), "V25 has no exit_note"),
                () -> assertTrue(!beforeColumns.contains("application_id"), "V25 has no application_id"),
                () -> assertEquals(1, afterTables, "upgrade creates attachment table"),
                () -> assertTrue(afterColumns.contains("exit_note"), "upgrade adds exit_note"),
                () -> assertTrue(afterColumns.contains("application_id"), "upgrade adds application_id"),
                () -> assertTrue(statusReasons.stream().allMatch(value -> value == null),
                        "existing applications keep null status_reason"));
    }

    @Test
    void in_twoActiveRestrictionsForSameUser_out_uniqueIndexRejectsSecond() {
        String jdbcUrl = sqliteUrl("active.db");
        migrate(jdbcUrl, null);
        JdbcClient jdbc = JdbcClient.create(new DriverManagerDataSource(jdbcUrl));
        jdbc.sql("""
                INSERT INTO credit_restriction
                  (id, user_id, type, trigger_reason, trigger_score, triggered_at, status, active_flag)
                VALUES (1, 1, 'auto_credit', 'CREDIT_SCORE_BELOW_60', 55, '2026-11-17T00:00:00Z', 'active', 1)
                """).update();

        assertThrows(RuntimeException.class, () -> jdbc.sql("""
                INSERT INTO credit_restriction
                  (id, user_id, type, trigger_reason, trigger_score, triggered_at, status, active_flag)
                VALUES (2, 1, 'auto_credit', 'CREDIT_SCORE_BELOW_60', 50, '2026-11-18T00:00:00Z', 'active', 1)
                """).update());

        jdbc.sql("""
                INSERT INTO credit_restriction
                  (id, user_id, type, trigger_reason, trigger_score, triggered_at, status, active_flag)
                VALUES (3, 1, 'auto_credit', 'CREDIT_SCORE_BELOW_60', 55, '2026-11-01T00:00:00Z', 'lifted', NULL)
                """).update();
        jdbc.sql("""
                INSERT INTO credit_restriction
                  (id, user_id, type, trigger_reason, trigger_score, triggered_at, status, active_flag)
                VALUES (4, 1, 'auto_credit', 'CREDIT_SCORE_BELOW_60', 55, '2026-11-02T00:00:00Z', 'lifted', NULL)
                """).update();
        int lifted = jdbc.sql("SELECT COUNT(*) FROM credit_restriction WHERE status = 'lifted'")
                .query(Integer.class).single();
        assertEquals(2, lifted, "multiple lifted rows share null active_flag");
    }

    private String sqliteUrl(String fileName) {
        return "jdbc:sqlite:" + tempDirectory.resolve(fileName).toAbsolutePath().toString().replace('\\', '/');
    }

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
