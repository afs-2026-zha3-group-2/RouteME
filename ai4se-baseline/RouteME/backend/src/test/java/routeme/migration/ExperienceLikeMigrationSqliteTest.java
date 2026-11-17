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
 * V22：新建 experience_likes（体验点赞关系），以 (experience_id, user_id) 唯一约束
 * 保证同一用户对同一体验至多一条记录；取消点赞直接删除行。
 */
class ExperienceLikeMigrationSqliteTest {

    @TempDir
    Path tempDirectory;

    @Test
    void in_emptySqliteFile_out_experienceLikesTableCreated() {
        // Given
        String jdbcUrl = jdbcUrl("fresh.db");
        migrate(jdbcUrl, null);
        JdbcClient jdbcClient = JdbcClient.create(new DriverManagerDataSource(jdbcUrl));

        // When
        List<String> columns = jdbcClient.sql("SELECT name FROM pragma_table_info('experience_likes')")
                .query(String.class)
                .list();
        int applied = jdbcClient.sql("""
                SELECT COUNT(*) FROM flyway_schema_history
                 WHERE success = 1 AND version = '22'
                """).query(Integer.class).single();

        // Then
        assertAll(
                () -> assertTrue(
                        columns.containsAll(List.of("id", "experience_id", "user_id", "created_at")),
                        "experience_likes columns"),
                () -> assertEquals(1, applied, "V22 applied once"));
    }

    @Test
    void in_databaseAtV20_out_experienceLikesAddedOnUpgrade() {
        // Given
        String jdbcUrl = jdbcUrl("upgrade.db");
        migrate(jdbcUrl, "20");
        JdbcClient beforeUpgrade = JdbcClient.create(new DriverManagerDataSource(jdbcUrl));
        int tablesBefore = beforeUpgrade
                .sql("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'experience_likes'")
                .query(Integer.class)
                .single();
        int experiencesBefore = beforeUpgrade
                .sql("SELECT COUNT(*) FROM trip_experiences")
                .query(Integer.class)
                .single();

        // When
        migrate(jdbcUrl, null);
        JdbcClient afterUpgrade = JdbcClient.create(new DriverManagerDataSource(jdbcUrl));
        int experiencesAfter = afterUpgrade
                .sql("SELECT COUNT(*) FROM trip_experiences")
                .query(Integer.class)
                .single();

        // Then
        assertAll(
                () -> assertEquals(0, tablesBefore, "V20 database has no like table yet"),
                () -> assertEquals(experiencesBefore, experiencesAfter, "existing experiences stay untouched"),
                () -> assertEquals(
                        0,
                        afterUpgrade.sql("SELECT COUNT(*) FROM experience_likes").query(Integer.class).single(),
                        "upgrade seeds no likes"));
    }

    @Test
    void in_duplicateLikeRow_out_uniqueConstraintRejects() {
        // Given
        String jdbcUrl = jdbcUrl("duplicate.db");
        migrate(jdbcUrl, null);
        JdbcClient jdbcClient = JdbcClient.create(new DriverManagerDataSource(jdbcUrl));
        jdbcClient.sql("""
                INSERT INTO experience_likes (id, experience_id, user_id, created_at)
                VALUES (1, 1, 1, '2026-11-17T00:00:00Z')
                """).update();

        // Then
        assertThrows(
                DataAccessException.class,
                () -> jdbcClient.sql("""
                        INSERT INTO experience_likes (id, experience_id, user_id, created_at)
                        VALUES (2, 1, 1, '2026-11-17T00:01:00Z')
                        """).update(),
                "same (experience_id, user_id) must be rejected");
        assertEquals(
                1,
                jdbcClient.sql("SELECT COUNT(*) FROM experience_likes").query(Integer.class).single(),
                "duplicate row is not persisted");
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

    private String jdbcUrl(String fileName) {
        return "jdbc:sqlite:"
                + tempDirectory.resolve(fileName).toAbsolutePath().toString().replace('\\', '/');
    }
}
