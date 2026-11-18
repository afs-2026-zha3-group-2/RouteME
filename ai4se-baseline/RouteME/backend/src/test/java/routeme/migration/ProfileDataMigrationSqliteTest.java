package routeme.migration;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Path;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

/**
 * 在临时 SQLite 文件库执行全部迁移，验证 V12 写入第 4 个演示用户与其行程、
 * V13 把该用户的职业与 MBTI 从 school 文案搬到各自的列、
 * V15 为其落库 zhouye / 123456 的登录凭据、
 * V34 把该用户改为在校学生并给演示账号补齐学信网认证。
 */
class ProfileDataMigrationSqliteTest {

    @TempDir
    Path tempDirectory;

    @Test
    void in_emptySqliteFile_out_profileViewerSeeded() {
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
        int trips = jdbcClient.sql("SELECT COUNT(*) FROM trip_plans").query(Integer.class).single();
        String school = jdbcClient.sql("SELECT school FROM app_users WHERE id = 4").query(String.class).single();
        String job = jdbcClient.sql("SELECT job FROM app_users WHERE id = 4").query(String.class).single();
        String mbti = jdbcClient.sql("SELECT mbti FROM app_users WHERE id = 4").query(String.class).single();
        String city = jdbcClient.sql("SELECT city FROM app_users WHERE id = 4").query(String.class).single();
        String nickname = jdbcClient.sql("SELECT nickname FROM app_users WHERE id = 4").query(String.class).single();
        String interests = jdbcClient.sql("SELECT interests FROM app_users WHERE id = 4").query(String.class).single();
        String createdAt = jdbcClient.sql("SELECT created_at FROM app_users WHERE id = 4").query(String.class).single();
        int studentVerified = jdbcClient.sql("SELECT student_verified FROM app_users WHERE id = 4")
                .query(Integer.class)
                .single();
        String verifiedSchool = jdbcClient.sql("SELECT student_verified_school FROM app_users WHERE id = 4")
                .query(String.class)
                .single();
        int credentialless = jdbcClient
                .sql("SELECT COUNT(*) FROM app_users WHERE id = 4 AND username IS NULL AND password_hash IS NULL")
                .query(Integer.class)
                .single();
        String viewerUsername = jdbcClient.sql("SELECT username FROM app_users WHERE id = 4")
                .query(String.class)
                .single();
        int publisherId = jdbcClient.sql("SELECT publisher_id FROM trip_plans WHERE id = 7")
                .query(Integer.class)
                .single();
        int joinedCount = jdbcClient.sql("SELECT joined_count FROM trip_plans WHERE id = 7")
                .query(Integer.class)
                .single();
        int capacity = jdbcClient.sql("SELECT capacity FROM trip_plans WHERE id = 7")
                .query(Integer.class)
                .single();
        String completedAt = jdbcClient.sql("SELECT completed_at FROM trip_plans WHERE id = 7")
                .query(String.class)
                .optional()
                .orElse(null);

        // Then
        assertAll(
                () -> assertEquals(5, users, "four demo users plus the seeded administrator"),
                () -> assertEquals(7, trips, "seeded trips"),
                () -> assertEquals("周野", nickname, "profile viewer nickname"),
                () -> assertEquals("", school, "identity lives in job / mbti, not school"),
                () -> assertEquals("学生", job, "the viewer is an in-school student"),
                () -> assertEquals("INFP", mbti, "student mbti"),
                () -> assertEquals("上海", city, "non-student city"),
                () -> assertTrue(interests.contains("展览"), "interests stored as JSON text"),
                () -> assertEquals("2026-03-15T09:20:00Z", createdAt, "fixed joined time"),
                () -> assertEquals(1, studentVerified, "demo accounts are CHSI-verified"),
                () -> assertEquals("同济大学", verifiedSchool, "viewer verification school"),
                () -> assertEquals(0, credentialless, "V15 gives the viewer account login credentials"),
                () -> assertEquals("zhouye", viewerUsername, "viewer username is the pinyin of the nickname"),
                () -> assertEquals(4, publisherId, "trip belongs to the new user"),
                () -> assertEquals(1, joinedCount, "trip counts its publisher"),
                () -> assertTrue(joinedCount < capacity, "trip stays recruiting"),
                () -> assertNull(completedAt, "trip is not completed"));
    }

    private String toSqlitePath(Path path) {
        return path.toAbsolutePath().toString().replace('\\', '/');
    }
}
