package routeme.migration;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

/**
 * 在临时 SQLite 文件库执行 V1–V10，验证 destination_code 非空回填、
 * 种子目的地标准名、体验关联与索引。
 */
class AreaCodeMigrationSqliteTest {

    @TempDir
    Path tempDirectory;

    @Test
    void in_emptySqliteFile_out_destinationCodesBackfilled() {
        // Given
        String databaseUrl = "jdbc:sqlite:" + toSqlitePath(tempDirectory.resolve("routeme.db"));
        Flyway.configure()
                .dataSource(databaseUrl, null, null)
                .locations("classpath:db/migration")
                .load()
                .migrate();
        JdbcClient jdbcClient = JdbcClient.create(new DriverManagerDataSource(databaseUrl));

        // When
        List<Map<String, Object>> seedTrips = jdbcClient.sql(
                        "SELECT id, destination, destination_code FROM trip_plans ORDER BY id")
                .query()
                .listOfRows();
        int experiences = jdbcClient.sql("SELECT COUNT(*) FROM trip_experiences").query(Integer.class).single();
        int linkedExperiences = jdbcClient.sql("""
                        SELECT COUNT(*)
                          FROM trip_experiences e
                          JOIN trip_plans t ON t.id = e.trip_id
                        """).query(Integer.class).single();
        int codeNotNull = jdbcClient.sql("""
                        SELECT COUNT(*)
                          FROM pragma_table_info('trip_plans')
                         WHERE name = 'destination_code' AND "notnull" = 1
                        """).query(Integer.class).single();
        int index = jdbcClient.sql("""
                        SELECT COUNT(*)
                          FROM sqlite_master
                         WHERE type = 'index' AND name = 'idx_trip_plans_destination_code'
                        """).query(Integer.class).single();

        // Then
        assertAll(
                () -> assertEquals(6, seedTrips.size(), "seed trips are preserved"),
                () -> assertEquals("珠海市", seedTrips.get(0).get("destination"), "zhuhai standard name"),
                () -> assertEquals("440400", seedTrips.get(0).get("destination_code"), "zhuhai code"),
                () -> assertEquals("清远市", seedTrips.get(1).get("destination"), "qingyuan standard name"),
                () -> assertEquals("441800", seedTrips.get(1).get("destination_code"), "qingyuan code"),
                () -> assertEquals("广州市", seedTrips.get(3).get("destination"), "guangzhou standard name"),
                () -> assertEquals("440100", seedTrips.get(3).get("destination_code"), "guangzhou code"),
                () -> assertEquals("深圳市", seedTrips.get(4).get("destination"), "shenzhen standard name"),
                () -> assertEquals("440300", seedTrips.get(4).get("destination_code"), "shenzhen code"),
                () -> assertEquals("佛山市", seedTrips.get(5).get("destination"), "foshan standard name"),
                () -> assertEquals("440600", seedTrips.get(5).get("destination_code"), "foshan code"),
                () -> assertEquals(2, experiences, "experiences are preserved"),
                () -> assertEquals(2, linkedExperiences, "experiences still join trips"),
                () -> assertEquals(1, codeNotNull, "destination_code is NOT NULL"),
                () -> assertEquals(1, index, "destination_code index exists"),
                () -> assertTrue(seedTrips.stream().allMatch(row -> row.get("destination_code") != null),
                        "no null destination_code"));
    }

    private String toSqlitePath(Path path) {
        return path.toAbsolutePath().toString().replace('\\', '/');
    }
}
