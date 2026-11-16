package routeme.migration;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Path;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import routeme.utils.PasswordUtils;

/**
 * 在临时 SQLite 文件库执行全部迁移，验证账号凭据列与 auth_sessions 表真的建立，
 * 且 V14 为三个演示人格账户（id 1–3）、V15 为周野（id 4）落库了可用 123456 登录的凭据，
 * 至此不存在任何无凭据的演示身份。
 */
class AuthMigrationSqliteTest {

    @TempDir
    Path tempDirectory;

    @Test
    void in_emptySqliteFile_out_credentialsAndSessionTable() {
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
        int credentials = jdbcClient
                .sql("SELECT COUNT(*) FROM app_users WHERE username IS NOT NULL OR password_hash IS NOT NULL")
                .query(Integer.class)
                .single();
        int sessions = jdbcClient.sql("SELECT COUNT(*) FROM auth_sessions").query(Integer.class).single();
        int seededUsernames = jdbcClient
                .sql("SELECT COUNT(*) FROM app_users WHERE id <= 4 AND username IS NOT NULL")
                .query(Integer.class)
                .single();
        String linjianxiaHash = jdbcClient
                .sql("SELECT password_hash FROM app_users WHERE username = 'linjianxia'")
                .query(String.class)
                .single();
        String chenyuHash = jdbcClient
                .sql("SELECT password_hash FROM app_users WHERE username = 'chenyu'")
                .query(String.class)
                .single();
        String sunianHash = jdbcClient
                .sql("SELECT password_hash FROM app_users WHERE username = 'sunian'")
                .query(String.class)
                .single();
        String viewerHash = jdbcClient
                .sql("SELECT password_hash FROM app_users WHERE username = 'zhouye'")
                .query(String.class)
                .single();

        // Then
        assertAll(
                () -> assertEquals(4, users, "demo users stay seeded"),
                () -> assertEquals(4, credentials, "all four seeded accounts carry login credentials"),
                () -> assertEquals(0, sessions, "no sessions before login"),
                () -> assertEquals(4, seededUsernames, "all four seeded accounts carry usernames"),
                () -> assertTrue(PasswordUtils.matches("123456", linjianxiaHash), "linjianxia logs in with 123456"),
                () -> assertTrue(PasswordUtils.matches("123456", chenyuHash), "chenyu logs in with 123456"),
                () -> assertTrue(PasswordUtils.matches("123456", sunianHash), "sunian logs in with 123456"),
                () -> assertTrue(PasswordUtils.matches("123456", viewerHash), "zhouye (id 4) logs in with 123456"),
                () -> assertFalse(PasswordUtils.matches("wrong-password", linjianxiaHash), "wrong password rejected"),
                () -> assertFalse(PasswordUtils.matches("wrong-password", viewerHash), "wrong password rejected for zhouye"));
    }

    private String toSqlitePath(Path path) {
        return path.toAbsolutePath().toString().replace('\\', '/');
    }
}