package routeme.migration;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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
 * V27：新增 credit_learning_session 一张空表。
 * 覆盖全新库与「已停在 V20 再升级」两条路径，并确认信用账户 / 账本与 app_users 结构不变。
 */
class CreditLearningMigrationSqliteTest {

    @TempDir
    Path tempDirectory;

    @Test
    void in_emptySqliteFile_out_learningSessionTableCreated() {
        // Given
        String jdbcUrl = jdbcUrl("fresh.db");
        migrate(jdbcUrl, "26");
        List<String> userColumnsBefore = JdbcClient.create(new DriverManagerDataSource(jdbcUrl))
                .sql("SELECT name FROM pragma_table_info('app_users')")
                .query(String.class)
                .list();
        migrate(jdbcUrl, null);
        JdbcClient jdbcClient = JdbcClient.create(new DriverManagerDataSource(jdbcUrl));

        // When
        int tables = jdbcClient
                .sql("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'credit_learning_session'")
                .query(Integer.class)
                .single();
        List<String> columns = jdbcClient.sql("SELECT name FROM pragma_table_info('credit_learning_session')")
                .query(String.class)
                .list();
        int indexes = jdbcClient
                .sql("SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND name = 'ix_credit_learning_user_month'")
                .query(Integer.class)
                .single();
        int sessions = jdbcClient.sql("SELECT COUNT(*) FROM credit_learning_session").query(Integer.class).single();
        int accounts = jdbcClient.sql("SELECT COUNT(*) FROM user_credit_account").query(Integer.class).single();
        int ledgerRows = jdbcClient.sql("SELECT COUNT(*) FROM credit_ledger").query(Integer.class).single();
        List<String> userColumns = jdbcClient.sql("SELECT name FROM pragma_table_info('app_users')")
                .query(String.class)
                .list();
        int restrictionTables = jdbcClient
                .sql("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'credit_restriction'")
                .query(Integer.class)
                .single();
        int applied = jdbcClient.sql("""
                SELECT COUNT(*) FROM flyway_schema_history
                 WHERE success = 1 AND version = '27'
                """).query(Integer.class).single();

        // Then
        assertAll(
                () -> assertEquals(1, tables, "learning session table created"),
                () -> assertEquals(
                        List.of(
                                "id", "user_id", "month_key", "status", "question_ids", "answers", "score", "passed",
                                "started_at", "learning_completed_at", "submitted_at"),
                        columns,
                        "learning session columns"),
                () -> assertEquals(1, indexes, "month index created"),
                () -> assertEquals(0, sessions, "new table starts empty"),
                () -> assertEquals(4, accounts, "credit accounts untouched"),
                () -> assertEquals(0, ledgerRows, "credit ledger untouched"),
                () -> assertEquals(userColumnsBefore, userColumns, "app_users keeps its columns"),
                () -> assertTrue(userColumns.contains("travel_style"), "app_users columns stay unchanged"),
                () -> assertFalse(userColumns.contains("score"), "app_users keeps no score column"),
                () -> assertFalse(userColumns.contains("restricted"), "app_users keeps no restriction column"),
                () -> assertEquals(1, restrictionTables, "restriction table still comes from V25"),
                () -> assertEquals(1, applied, "V27 applied once"));
    }

    @Test
    void in_databaseAtV20_out_learningSessionAddedAndCreditDataUnchanged() {
        // Given
        String jdbcUrl = jdbcUrl("upgrade.db");
        migrate(jdbcUrl, "20");
        JdbcClient beforeUpgrade = JdbcClient.create(new DriverManagerDataSource(jdbcUrl));
        int sessionsBefore = beforeUpgrade
                .sql("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'credit_learning_session'")
                .query(Integer.class)
                .single();
        List<Integer> accountsBefore = beforeUpgrade
                .sql("SELECT score FROM user_credit_account ORDER BY user_id")
                .query(Integer.class)
                .list();

        // When
        migrate(jdbcUrl, null);
        JdbcClient afterUpgrade = JdbcClient.create(new DriverManagerDataSource(jdbcUrl));
        int sessionsAfter = afterUpgrade
                .sql("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'credit_learning_session'")
                .query(Integer.class)
                .single();
        List<Integer> accountsAfter = afterUpgrade
                .sql("SELECT score FROM user_credit_account ORDER BY user_id")
                .query(Integer.class)
                .list();
        int ledgerRows = afterUpgrade.sql("SELECT COUNT(*) FROM credit_ledger").query(Integer.class).single();

        // Then
        assertAll(
                () -> assertEquals(0, sessionsBefore, "V20 database has no learning table yet"),
                () -> assertEquals(1, sessionsAfter, "upgrade adds the learning table"),
                () -> assertEquals(List.of(80, 80, 80, 80), accountsBefore, "accounts start at 80"),
                () -> assertEquals(accountsBefore, accountsAfter, "upgrade leaves scores unchanged"),
                () -> assertEquals(0, ledgerRows, "upgrade writes no ledger rows"));
    }

    @Test
    void in_submittedRow_out_statusPassedScoreRoundTrip() {
        // Given
        String jdbcUrl = jdbcUrl("roundtrip.db");
        migrate(jdbcUrl, null);
        JdbcClient jdbcClient = JdbcClient.create(new DriverManagerDataSource(jdbcUrl));

        // When
        jdbcClient.sql("""
                INSERT INTO credit_learning_session
                    (id, user_id, month_key, status, question_ids, answers, score, passed,
                     started_at, learning_completed_at, submitted_at)
                VALUES
                    (1, 2, '2026-11', 'submitted', '["Q01","Q02"]', '[1,2]', 8, 1,
                     '2026-11-17T02:00:00Z', '2026-11-17T02:05:00Z', '2026-11-17T02:10:00Z')
                """).update();
        String status = jdbcClient.sql("SELECT status FROM credit_learning_session WHERE id = 1")
                .query(String.class)
                .single();
        Integer passed = jdbcClient.sql("SELECT passed FROM credit_learning_session WHERE id = 1")
                .query(Integer.class)
                .single();
        Integer score = jdbcClient.sql("SELECT score FROM credit_learning_session WHERE id = 1")
                .query(Integer.class)
                .single();

        // Then
        assertAll(
                () -> assertEquals("submitted", status, "status round trip"),
                () -> assertEquals(1, passed, "passed stored as 0/1"),
                () -> assertEquals(8, score, "score round trip"));
    }

    private String jdbcUrl(String fileName) {
        String databaseUrl = "sqlite:" + tempDirectory.resolve(fileName).toAbsolutePath().toString().replace('\\', '/');
        return "jdbc:" + databaseUrl;
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
