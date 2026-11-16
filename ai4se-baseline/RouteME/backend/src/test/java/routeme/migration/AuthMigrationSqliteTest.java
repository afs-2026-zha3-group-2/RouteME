package routeme.migration;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.nio.file.Path;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

/**
 * 在临时 SQLite 文件库执行全部迁移，验证账号凭据列与 auth_sessions 表真的建立，
 * 且演示账户没有密码凭据（不能密码登录）。
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
        int demoUsernames = jdbcClient
                .sql("SELECT COUNT(*) FROM app_users WHERE id <= 3 AND username IS NOT NULL")
                .query(Integer.class)
                .single();

        // Then
        assertAll(
                () -> assertEquals(3, users, "demo users stay seeded"),
                () -> assertEquals(0, credentials, "demo accounts have no credentials"),
                () -> assertEquals(0, sessions, "no sessions before login"),
                () -> assertEquals(0, demoUsernames, "demo account usernames are null"));
    }

    private String toSqlitePath(Path path) {
        return path.toAbsolutePath().toString().replace('\\', '/');
    }
}