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
 * V35：建成长账户与经验流水两张表，并把 app_users 全表回填为 0 EXP。
 * 覆盖全新库与「已停在上一个版本再升级」两条路径，并确认不回填历史事件。
 */
class GrowthMigrationSqliteTest {

    @TempDir
    Path tempDirectory;

    @Test
    void in_emptySqliteFile_out_growthTablesCreatedAndBackfilled() {
        // Given
        String jdbcUrl = "jdbc:sqlite:"
                + tempDirectory.resolve("fresh.db").toAbsolutePath().toString().replace('\\', '/');
        migrate(jdbcUrl, null);
        JdbcClient jdbcClient = JdbcClient.create(new DriverManagerDataSource(jdbcUrl));

        // When
        int users = jdbcClient.sql("SELECT COUNT(*) FROM app_users").query(Integer.class).single();
        int accounts = jdbcClient.sql("SELECT COUNT(*) FROM user_growth_account").query(Integer.class).single();
        int minimumExp = jdbcClient.sql("SELECT MIN(exp_total) FROM user_growth_account").query(Integer.class).single();
        int maximumExp = jdbcClient.sql("SELECT MAX(exp_total) FROM user_growth_account").query(Integer.class).single();
        int ledgerRows = jdbcClient.sql("SELECT COUNT(*) FROM growth_exp_ledger").query(Integer.class).single();
        int applied = jdbcClient.sql("""
                SELECT COUNT(*) FROM flyway_schema_history
                 WHERE success = 1 AND version = '32'
                """).query(Integer.class).single();

        // Then
        assertAll(
                () -> assertEquals(users, accounts, "every existing user gets a growth account"),
                () -> assertEquals(0, minimumExp, "initial exp is 0"),
                () -> assertEquals(0, maximumExp, "initial exp is 0"),
                () -> assertEquals(0, ledgerRows, "backfill writes no ledger rows"),
                () -> assertEquals(1, applied, "V35 applied once"));
    }

    @Test
    void in_databaseAtV31_out_growthAccountBackfilledOnUpgrade() {
        // Given
        String jdbcUrl = "jdbc:sqlite:"
                + tempDirectory.resolve("upgrade.db").toAbsolutePath().toString().replace('\\', '/');
        migrate(jdbcUrl, "31");
        JdbcClient beforeUpgrade = JdbcClient.create(new DriverManagerDataSource(jdbcUrl));
        int tablesBefore = beforeUpgrade
                .sql("""
                        SELECT COUNT(*) FROM sqlite_master
                         WHERE type = 'table' AND name IN ('user_growth_account', 'growth_exp_ledger')
                        """)
                .query(Integer.class)
                .single();

        // When
        migrate(jdbcUrl, null);
        JdbcClient afterUpgrade = JdbcClient.create(new DriverManagerDataSource(jdbcUrl));
        int users = afterUpgrade.sql("SELECT COUNT(*) FROM app_users").query(Integer.class).single();
        int accounts = afterUpgrade.sql("SELECT COUNT(*) FROM user_growth_account").query(Integer.class).single();
        List<Integer> expValues = afterUpgrade.sql("SELECT exp_total FROM user_growth_account ORDER BY user_id")
                .query(Integer.class)
                .list();

        // Then
        assertAll(
                () -> assertEquals(0, tablesBefore, "V31 database has no growth tables yet"),
                () -> assertEquals(users, accounts, "upgrade backfills every existing account"),
                () -> assertTrue(expValues.stream().allMatch(value -> value == 0), "existing accounts start at 0"));
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
