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
 * 在临时 SQLite 文件库执行全部迁移，验证资料列建立、V13 为 4 个演示账号回填资料列，
 * 旧 school 文案不被回填改写；V14 与 V15 后全部种子账号均具备可登录凭据。
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
        int filledProfiles = jdbcClient.sql("""
                SELECT COUNT(*) FROM app_users
                 WHERE birthday IS NOT NULL AND gender IS NOT NULL AND city IS NOT NULL
                   AND job IS NOT NULL AND mbti IS NOT NULL AND travel_style IS NOT NULL
                """).query(Integer.class).single();
        String secondSchool = jdbcClient.sql("SELECT school FROM app_users WHERE id = 2")
                .query(String.class)
                .single();
        String viewerSchool = jdbcClient.sql("SELECT school FROM app_users WHERE id = 4")
                .query(String.class)
                .single();
        int credentialless = jdbcClient
                .sql("SELECT COUNT(*) FROM app_users WHERE username IS NULL AND password_hash IS NULL")
                .query(Integer.class)
                .single();
        List<String> applied = jdbcClient.sql("""
                SELECT version FROM flyway_schema_history
                 WHERE success = 1 AND version IN ('1', '2', '3', '4', '5', '6', '7', '8', '9',
                                                   '10', '11', '12', '13')
                """).query(String.class).list();

        // Then
        assertAll(
                () -> assertEquals(4, users, "demo users stay seeded"),
                () -> assertEquals(4, filledProfiles, "V13 fills every demo profile"),
                () -> assertEquals("研一 · 地理科学", secondSchool, "legacy school text is preserved"),
                () -> assertEquals("", viewerSchool, "the viewer identity keeps job / mbti instead of school"),
                () -> assertEquals(0, credentialless, "every seeded account now carries login credentials"),
                () -> assertEquals(13, applied.size(), "V1–V13 applied"),
                () -> assertTrue(applied.contains("10"), "V10 added profile columns"),
                () -> assertTrue(applied.contains("11"), "V11 added the destination code"),
                () -> assertTrue(applied.contains("12"), "V12 seeded the viewer profile user"),
                () -> assertTrue(applied.contains("13"), "V13 seeded demo profiles"));
    }

    private String toSqlitePath(Path path) {
        return path.toAbsolutePath().toString().replace('\\', '/');
    }
}