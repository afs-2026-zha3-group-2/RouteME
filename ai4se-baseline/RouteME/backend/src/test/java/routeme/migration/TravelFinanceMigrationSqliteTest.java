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
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

/**
 * V30：建钱包 / 流水 / 第三方保险状态 / 借款四表、唯一与普通索引，
 * 并把 app_users 全表回填为 1,000,000 分。
 * 覆盖全新库与「已停在上一个版本再升级」两条路径。迁移必须同时兼容 SQLite 与 H2。
 */
class TravelFinanceMigrationSqliteTest {

    private static final int INITIAL_BALANCE_CENTS = 1_000_000;

    private static final List<String> TABLES = List.of(
            "user_wallet", "wallet_ledger", "insurance_policy", "travel_loan");

    private static final List<String> INDEXES = List.of(
            "ux_insurance_policy_user_trip",
            "ux_travel_loan_active_user",
            "ix_wallet_ledger_user_time",
            "ix_insurance_policy_user_time",
            "ix_travel_loan_user_time",
            "ix_travel_loan_trip");

    private static final List<String> INSURANCE_COLUMNS = List.of(
            "user_id", "trip_id", "provider", "coverage_start", "coverage_end", "status", "confirmed_at");

    @TempDir
    Path tempDirectory;

    @Test
    void in_emptySqliteFile_out_financeTablesCreatedAndBackfilled() {
        // Given
        String jdbcUrl = jdbcUrl("fresh.db");
        migrate(jdbcUrl, null);
        JdbcClient jdbcClient = JdbcClient.create(new DriverManagerDataSource(jdbcUrl));

        // When
        int users = jdbcClient.sql("SELECT COUNT(*) FROM app_users").query(Integer.class).single();
        int wallets = jdbcClient.sql("SELECT COUNT(*) FROM user_wallet").query(Integer.class).single();
        int minimumBalance = jdbcClient.sql("SELECT MIN(balance_cents) FROM user_wallet").query(Integer.class).single();
        int maximumBalance = jdbcClient.sql("SELECT MAX(balance_cents) FROM user_wallet").query(Integer.class).single();
        int ledgerRows = jdbcClient.sql("SELECT COUNT(*) FROM wallet_ledger").query(Integer.class).single();
        int policies = jdbcClient.sql("SELECT COUNT(*) FROM insurance_policy").query(Integer.class).single();
        int loans = jdbcClient.sql("SELECT COUNT(*) FROM travel_loan").query(Integer.class).single();
        int applied = jdbcClient.sql("""
                SELECT COUNT(*) FROM flyway_schema_history
                 WHERE success = 1 AND version = '30'
                """).query(Integer.class).single();

        // Then
        assertAll(
                () -> TABLES.forEach(table ->
                        assertEquals(1, objectCount(jdbcClient, "table", table), table + " created")),
                () -> INDEXES.forEach(index ->
                        assertEquals(1, objectCount(jdbcClient, "index", index), index + " created")),
                () -> assertEquals(5, users, "seeded demo accounts plus the seeded administrator"),
                () -> assertEquals(users, wallets, "every existing account gets exactly one wallet"),
                () -> assertEquals(INITIAL_BALANCE_CENTS, minimumBalance, "initial balance is 1,000,000 cents"),
                () -> assertEquals(INITIAL_BALANCE_CENTS, maximumBalance, "initial balance is 1,000,000 cents"),
                () -> assertEquals(0, ledgerRows, "backfill writes no ledger rows"),
                () -> assertEquals(0, policies, "backfill writes no policies"),
                () -> assertEquals(0, loans, "backfill writes no loans"),
                () -> assertEquals(1, applied, "V30 applied once"));
    }

    @Test
    void in_databaseBeforeV30_out_walletBackfilledOnUpgrade() {
        // Given：先停在 V29（本变更合入前的 Flyway head）。
        String jdbcUrl = jdbcUrl("upgrade.db");
        migrate(jdbcUrl, "29");
        JdbcClient beforeUpgrade = JdbcClient.create(new DriverManagerDataSource(jdbcUrl));
        int walletsBefore = objectCount(beforeUpgrade, "table", "user_wallet");

        // When
        migrate(jdbcUrl, null);
        JdbcClient afterUpgrade = JdbcClient.create(new DriverManagerDataSource(jdbcUrl));
        int usersAfter = afterUpgrade.sql("SELECT COUNT(*) FROM app_users").query(Integer.class).single();
        List<Integer> balances = afterUpgrade.sql("SELECT balance_cents FROM user_wallet ORDER BY user_id")
                .query(Integer.class)
                .list();

        // Then
        assertAll(
                () -> assertEquals(0, walletsBefore, "pre-V30 database has no wallet table yet"),
                () -> assertEquals(usersAfter, balances.size(), "upgrade backfills every existing account"),
                () -> assertTrue(
                        balances.stream().allMatch(balance -> balance == INITIAL_BALANCE_CENTS),
                        "every upgraded account starts at 1,000,000 cents"));
    }

    @Test
    void in_insurancePolicy_out_thirdPartyColumnsAndStatusCheck() {
        // Given
        String jdbcUrl = jdbcUrl("insurance.db");
        migrate(jdbcUrl, null);
        JdbcClient jdbcClient = JdbcClient.create(new DriverManagerDataSource(jdbcUrl));

        // When
        List<String> columns = jdbcClient.sql("PRAGMA table_info(insurance_policy)")
                .query((rs, rowNum) -> rs.getString("name"))
                .list();

        // Then：只保留第三方状态所需字段，不含保费 / 保额 / 保单号 / 证件号。
        assertAll(
                () -> assertTrue(columns.containsAll(INSURANCE_COLUMNS), "third-party columns present: " + columns),
                () -> assertTrue(columns.stream().noneMatch(column -> column.contains("premium")
                        || column.contains("coverage_cents")
                        || column.contains("policy_no")
                        || column.contains("id_card")), "no pricing or sensitive columns: " + columns),
                () -> assertThrows(DataAccessException.class, () -> jdbcClient.sql("""
                                INSERT INTO insurance_policy
                                    (id, user_id, trip_id, provider, coverage_start, coverage_end, status, confirmed_at)
                                VALUES
                                    (1, 1, 3, 'demo', '2026-12-20', '2026-12-23', 'UNKNOWN', '2026-11-18T00:00:00Z')
                                """).update(),
                        "status outside ACTIVE / EXPIRED is rejected"));
    }

    @Test
    void in_upgradeFromV31_out_interestBackfilledAndPenaltyAdded() {
        // Given：V31 时已有一笔 1,000 元 / 14 天借款（当时只有本金口径）。
        String jdbcUrl = jdbcUrl("interest.db");
        migrate(jdbcUrl, "31");
        JdbcClient beforeUpgrade = JdbcClient.create(new DriverManagerDataSource(jdbcUrl));
        beforeUpgrade.sql("""
                        INSERT INTO travel_loan
                            (id, user_id, trip_id, principal_cents, service_fee_cents, disbursed_cents,
                             repay_cents, term_days, status, active_user_id, funded_at, due_at, repaid_at)
                        VALUES
                            (9001, 2, 3, 100000, 5000, 95000, 100000, 14, 'ACTIVE', 2,
                             '2026-11-01T09:00:00Z', '2026-11-15T09:00:00Z', NULL)
                        """)
                .update();

        // When
        migrate(jdbcUrl, null);
        JdbcClient afterUpgrade = JdbcClient.create(new DriverManagerDataSource(jdbcUrl));
        List<String> columns = afterUpgrade.sql("PRAGMA table_info(travel_loan)")
                .query((rs, rowNum) -> rs.getString("name"))
                .list();

        // Then
        assertAll(
                () -> assertTrue(
                        columns.containsAll(List.of("interest_cents", "penalty_cents")),
                        "interest and penalty columns present: " + columns),
                () -> assertEquals(
                        700,
                        afterUpgrade.sql("SELECT interest_cents FROM travel_loan WHERE id = 9001")
                                .query(Integer.class)
                                .single(),
                        "1,000 yuan over 14 days costs 7 yuan of interest"),
                () -> assertEquals(
                        100_700,
                        afterUpgrade.sql("SELECT repay_cents FROM travel_loan WHERE id = 9001")
                                .query(Integer.class)
                                .single(),
                        "repay is principal plus interest"),
                () -> assertEquals(
                        0,
                        afterUpgrade.sql("SELECT penalty_cents FROM travel_loan WHERE id = 9001")
                                .query(Integer.class)
                                .single(),
                        "no penalty before the due instant"),
                () -> assertEquals(
                        1,
                        objectCount(afterUpgrade, "index", "ux_travel_loan_active_user"),
                        "active-loan unique index survives the table rebuild"),
                () -> assertThrows(
                        DataAccessException.class,
                        () -> afterUpgrade.sql("UPDATE travel_loan SET penalty_cents = -1 WHERE id = 9001")
                                .update(),
                        "negative penalty is rejected"),
                () -> assertThrows(
                        DataAccessException.class,
                        () -> afterUpgrade.sql("UPDATE travel_loan SET repay_cents = principal_cents WHERE id = 9001")
                                .update(),
                        "repay must include interest"));
    }

    private String jdbcUrl(String fileName) {
        String path = tempDirectory.resolve(fileName).toAbsolutePath().toString().replace('\\', '/');
        return "jdbc:sqlite:" + path;
    }

    private int objectCount(JdbcClient jdbcClient, String type, String name) {
        return jdbcClient.sql("SELECT COUNT(*) FROM sqlite_master WHERE type = :type AND name = :name")
                .param("type", type)
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
            configuration.target(MigrationVersion.fromVersion(targetVersion));
        }
        configuration.load().migrate();
    }
}