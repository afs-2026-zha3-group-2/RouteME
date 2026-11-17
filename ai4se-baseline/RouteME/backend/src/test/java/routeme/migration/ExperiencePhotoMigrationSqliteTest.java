package routeme.migration;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.nio.file.Path;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

/**
 * 在临时 SQLite 文件库验证 V18：全新库 V1→V18 与旧库 V17→V18 都能建出照片表与索引。
 */
class ExperiencePhotoMigrationSqliteTest {

    private static final String PHOTO_TABLE = """
            SELECT COUNT(*) FROM sqlite_master
             WHERE type = 'table' AND name = 'trip_experience_photos'
            """;

    private static final String PHOTO_INDEXES = """
            SELECT COUNT(*) FROM sqlite_master
             WHERE type = 'index' AND name IN
               ('idx_experience_photos_scope', 'idx_experience_photos_experience')
            """;

    @TempDir
    Path tempDirectory;

    @Test
    void in_emptySqliteFile_out_photoTableAndIndexes() {
        // Given
        String databaseUrl = databaseUrl("fresh.db");

        // When
        migrate(databaseUrl, null);
        JdbcClient jdbcClient = JdbcClient.create(new DriverManagerDataSource(databaseUrl));

        // Then
        assertAll(
                () -> assertEquals(1, count(jdbcClient, PHOTO_TABLE), "photo table exists"),
                () -> assertEquals(2, count(jdbcClient, PHOTO_INDEXES), "photo indexes exist"),
                () -> assertEquals(0, count(jdbcClient, "SELECT COUNT(*) FROM trip_experience_photos"),
                        "photo table starts empty"));
    }

    @Test
    void in_v17Database_out_upgradedPhotoTable() {
        // Given
        String databaseUrl = databaseUrl("upgrade.db");
        migrate(databaseUrl, "17");
        JdbcClient jdbcClient = JdbcClient.create(new DriverManagerDataSource(databaseUrl));
        assertEquals(0, count(jdbcClient, PHOTO_TABLE), "V17 has no photo table");

        // When
        migrate(databaseUrl, null);

        // Then
        assertAll(
                () -> assertEquals(1, count(jdbcClient, PHOTO_TABLE), "V18 creates photo table"),
                () -> assertEquals(2, count(jdbcClient, PHOTO_INDEXES), "V18 creates photo indexes"),
                () -> assertEquals(2, count(jdbcClient, "SELECT COUNT(*) FROM trip_experiences"),
                        "existing experiences are preserved"));
    }

    private void migrate(String databaseUrl, String target) {
        Flyway configured = Flyway.configure()
                .dataSource(databaseUrl, null, null)
                .locations("classpath:db/migration")
                .target(target == null ? MigrationVersion.LATEST : MigrationVersion.fromVersion(target))
                .load();
        configured.migrate();
    }

    private int count(JdbcClient jdbcClient, String sql) {
        return jdbcClient.sql(sql).query(Integer.class).single();
    }

    private String databaseUrl(String fileName) {
        return "jdbc:sqlite:" + tempDirectory.resolve(fileName).toAbsolutePath().toString().replace('\\', '/');
    }
}
