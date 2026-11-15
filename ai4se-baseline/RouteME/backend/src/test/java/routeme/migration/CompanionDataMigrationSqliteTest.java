package routeme.migration;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.nio.file.Path;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

/**
 * 在临时 SQLite 文件库执行 V1–V7，验证申请种子与 trip_plans.joined_count 一致。
 */
class CompanionDataMigrationSqliteTest {

    @TempDir
    Path tempDirectory;

    @Test
    void in_emptySqliteFile_out_applicationsMatchJoinedCounts() {
        // Given
        String databaseUrl = "jdbc:sqlite:" + toSqlitePath(tempDirectory.resolve("routeme.db"));
        Flyway.configure()
                .dataSource(databaseUrl, null, null)
                .locations("classpath:db/migration")
                .load()
                .migrate();
        JdbcClient jdbcClient = JdbcClient.create(new DriverManagerDataSource(databaseUrl));

        // When
        int applications = count(jdbcClient, "SELECT COUNT(*) FROM trip_applications");
        int accepted = count(jdbcClient, "SELECT COUNT(*) FROM trip_applications WHERE status = 'ACCEPTED'");
        int pending = count(jdbcClient, "SELECT COUNT(*) FROM trip_applications WHERE status = 'PENDING'");
        int inconsistent = count(jdbcClient, """
                SELECT COUNT(*) FROM trip_plans t
                 WHERE t.joined_count - 1 <> (
                       SELECT COUNT(*) FROM trip_applications a
                        WHERE a.trip_id = t.id AND a.status = 'ACCEPTED')
                """);
        int messages = count(jdbcClient, "SELECT COUNT(*) FROM chat_messages");
        int reports = count(jdbcClient, "SELECT COUNT(*) FROM reports");

        // Then
        assertAll(
                () -> assertEquals(7, applications, "seeded applications"),
                () -> assertEquals(5, accepted, "accepted applications"),
                () -> assertEquals(2, pending, "pending applications"),
                () -> assertEquals(0, inconsistent, "joined_count matches accepted applications"),
                () -> assertEquals(4, messages, "seeded messages"),
                () -> assertEquals(0, reports, "reports start empty")
        );
    }

    private int count(JdbcClient jdbcClient, String sql) {
        return jdbcClient.sql(sql).query(Integer.class).single();
    }

    private String toSqlitePath(Path path) {
        return path.toAbsolutePath().toString().replace('\\', '/');
    }
}