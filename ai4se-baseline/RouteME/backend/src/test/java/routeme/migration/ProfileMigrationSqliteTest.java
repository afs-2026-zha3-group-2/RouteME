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

/**
 * 在临时 SQLite 文件库执行 V1–V11，验证资料列建立、演示账号可读且新列为 NULL、
 * 旧 school 文案不被回填改写。
 */
class ProfileMigrationSqliteTest {

    @TempDir
    Path tempDirectory;

    @Test
    void in_emptySqliteFile_out_profileColumnsAdded() {
        // Given
        String databaseUrl = "jdbc:sqlite:" + toSqlitePath(tempDirectory.resolve("routeme.db"));
        Flyway.configure()
                .dataSource(databaseUrl, null, null)
                .locations("classpath:db/migration")
                .load()
                .migrate();
        JdbcClient jdbcClient = JdbcClient.create(new DriverManagerDataSource(databaseUrl));

        // When
        int users = jdbcClient.sql("SELECT COUNT(*) FROM app_users").query(Integer.class).single();
        int unfilledProfiles = jdbcClient.sql("""
                SELECT COUNT(*) FROM app_users
                 WHERE avatar_url IS NOT NULL OR birthday IS NOT NULL OR gender IS NOT NULL
                    OR city IS NOT NULL OR major IS NOT NULL OR job IS NOT NULL
                    OR mbti IS NOT NULL OR travel_style IS NOT NULL
                """).query(Integer.class).single();
        String secondSchool = jdbcClient.sql("SELECT school FROM app_users WHERE id = 2")
                .query(String.class)
                .single();
        List<String> applied = jdbcClient.sql("""
                SELECT version FROM flyway_schema_history
                 WHERE success = 1 AND version IN ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11')
                """).query(String.class).list();

        // Then
        assertAll(
                () -> assertEquals(4, users, "demo users stay seeded"),
                () -> assertEquals(0, unfilledProfiles, "new profile columns stay NULL for legacy rows"),
                () -> assertEquals("研一 · 地理科学", secondSchool, "legacy school text is preserved"),
                () -> assertEquals(11, applied.size(), "V1–V11 applied"),
                () -> assertTrue(applied.contains("10"), "V10 added profile columns"),
                () -> assertTrue(applied.contains("11"), "V11 seeded the viewer profile user"));
    }

    private String toSqlitePath(Path path) {
        return path.toAbsolutePath().toString().replace('\\', '/');
    }
}