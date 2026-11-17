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
 * V20：建信用账户与账本两张表，并把 app_users 全表回填为 80 分。
 * 覆盖全新库与「已停在上一个版本再升级」两条路径，并确认 app_users 结构不变。
 */
class CreditMigrationSqliteTest {

    @TempDir
    Path tempDirectory;

    @Test
    void in_emptySqliteFile_out_creditTablesCreatedAndBackfilled() {
        // Given
        String databaseUrl = "sqlite:" + tempDirectory.resolve("fresh.db").toAbsolutePath().toString().replace('\\', '/');
        String jdbcUrl = "jdbc:" + databaseUrl;
        migrate(jdbcUrl, null);
        JdbcClient jdbcClient = JdbcClient.create(new DriverManagerDataSource(jdbcUrl));

        // When
        int accounts = jdbcClient.sql("SELECT COUNT(*) FROM user_credit_account").query(Integer.class).single();
        int minimumScore = jdbcClient.sql("SELECT MIN(score) FROM user_credit_account").query(Integer.class).single();
        int maximumScore = jdbcClient.sql("SELECT MAX(score) FROM user_credit_account").query(Integer.class).single();
        int ledgerRows = jdbcClient.sql("SELECT COUNT(*) FROM credit_ledger").query(Integer.class).single();
        List<String> userColumns = jdbcClient.sql("SELECT name FROM pragma_table_info('app_users')")
                .query(String.class)
                .list();
        int applied = jdbcClient.sql("""
                SELECT COUNT(*) FROM flyway_schema_history
                 WHERE success = 1 AND version = '20'
                """).query(Integer.class).single();

        // Then
        assertAll(
                () -> assertEquals(4, accounts, "every seeded account gets a credit account"),
                () -> assertEquals(80, minimumScore, "initial score is 80"),
                () -> assertEquals(80, maximumScore, "initial score is 80"),
                () -> assertEquals(0, ledgerRows, "backfill writes no ledger rows"),
                () -> assertFalse(userColumns.contains("score"), "app_users keeps no score column"),
                () -> assertTrue(userColumns.contains("travel_style"), "app_users columns stay unchanged"),
                () -> assertEquals(1, applied, "V20 applied once"));
    }

    @Test
    void in_databaseAtV19_out_creditAccountBackfilledOnUpgrade() {
        // Given
        String jdbcUrl = "jdbc:sqlite:"
                + tempDirectory.resolve("upgrade.db").toAbsolutePath().toString().replace('\\', '/');
        migrate(jdbcUrl, "19");
        JdbcClient beforeUpgrade = JdbcClient.create(new DriverManagerDataSource(jdbcUrl));
        int accountsBefore = beforeUpgrade
                .sql("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'user_credit_account'")
                .query(Integer.class)
                .single();

        // When
        migrate(jdbcUrl, null);
        JdbcClient afterUpgrade = JdbcClient.create(new DriverManagerDataSource(jdbcUrl));
        int accountsAfter = afterUpgrade.sql("SELECT COUNT(*) FROM user_credit_account").query(Integer.class).single();
        List<Integer> scores = afterUpgrade.sql("SELECT score FROM user_credit_account ORDER BY user_id")
                .query(Integer.class)
                .list();

        // Then
        assertAll(
                () -> assertEquals(0, accountsBefore, "V19 database has no credit table yet"),
                () -> assertEquals(4, accountsAfter, "upgrade backfills every existing account"),
                () -> assertEquals(List.of(80, 80, 80, 80), scores, "existing accounts start at 80"));
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
