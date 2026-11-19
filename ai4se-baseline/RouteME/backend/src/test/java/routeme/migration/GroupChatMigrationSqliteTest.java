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
 * Verifies V39 adds trip_group_messages with the trip/sent_at index on SQLite and
 * backfills exactly one publisher welcome message per existing full trip that is
 * neither completed nor cancelled; completed / cancelled full trips are skipped.
 */
class GroupChatMigrationSqliteTest {

    @TempDir
    Path tempDirectory;

    @Test
    void in_seedAndCustomFullTrips_out_welcomeBackfillOnlyForActiveOnes() {
        // Given: migrate to V38 first so custom full trips exist before the V39 backfill.
        String databaseUrl = "jdbc:sqlite:" + toSqlitePath(tempDirectory.resolve("routeme.db"));
        Flyway.configure()
                .dataSource(databaseUrl, null, null)
                .locations("classpath:db/migration")
                .target("38")
                .load()
                .migrate();
        JdbcClient jdbcClient = JdbcClient.create(new DriverManagerDataSource(databaseUrl));
        jdbcClient.sql("""
                INSERT INTO trip_plans
                    (id, publisher_id, title, destination, destination_code, start_date, end_date,
                     stops, tags, capacity, joined_count, completed_at, cancelled_at, created_at, updated_at)
                VALUES
                    (90, 1, '满员已结束', '珠海市', '440400', '2026-11-06', '2026-11-06',
                     '["甲","乙"]', '[]', 2, 2, '2026-11-06T12:00:00Z', NULL,
                     '2026-10-27T21:12:00Z', '2026-11-06T12:00:00Z'),
                    (91, 1, '满员已取消', '珠海市', '440400', '2026-11-20', '2026-11-20',
                     '["甲","乙"]', '[]', 2, 2, NULL, '2026-11-15T09:00:00Z',
                     '2026-11-10T21:12:00Z', '2026-11-15T09:00:00Z'),
                    (92, 1, '满员未结束', '珠海市', '440400', '2026-11-20', '2026-11-20',
                     '["甲","乙"]', '[]', 2, 2, NULL, NULL,
                     '2026-11-10T21:12:00Z', '2026-11-10T21:12:00Z')
                """).update();

        // When
        Flyway.configure()
                .dataSource(databaseUrl, null, null)
                .locations("classpath:db/migration")
                .load()
                .migrate();
        List<String> columns = jdbcClient.sql("SELECT name FROM pragma_table_info('trip_group_messages')")
                .query(String.class)
                .list();
        int tripIndex = jdbcClient.sql("""
                SELECT COUNT(*) FROM sqlite_master
                 WHERE type = 'index' AND name = 'idx_trip_group_messages_trip'
                """).query(Integer.class).single();
        List<Long> backfilledTrips = jdbcClient.sql(
                        "SELECT trip_id FROM trip_group_messages ORDER BY trip_id")
                .query(Long.class)
                .list();
        String welcome = jdbcClient.sql("SELECT content FROM trip_group_messages WHERE trip_id = 92")
                .query(String.class)
                .single();
        Long welcomeSender = jdbcClient.sql("SELECT sender_id FROM trip_group_messages WHERE trip_id = 92")
                .query(Long.class)
                .single();
        String welcomeSentAt = jdbcClient.sql("SELECT sent_at FROM trip_group_messages WHERE trip_id = 92")
                .query(String.class)
                .single();
        int seedWelcomeCount = jdbcClient.sql(
                        "SELECT COUNT(*) FROM trip_group_messages WHERE trip_id = 6")
                .query(Integer.class)
                .single();

        // The service lists by (sent_at, id); a later message must sort after the welcome.
        jdbcClient.sql("""
                INSERT INTO trip_group_messages (id, trip_id, sender_id, content, sent_at)
                VALUES (900, 6, 2, '集合点改一下', '2026-11-16T09:00:00Z')
                """).update();
        List<Long> orderedIds = jdbcClient.sql("""
                SELECT id FROM trip_group_messages WHERE trip_id = 6
                 ORDER BY sent_at, id
                """).query(Long.class).list();
        int v39Applied = jdbcClient.sql(
                        "SELECT COUNT(*) FROM flyway_schema_history WHERE version = '39' AND success = 1")
                .query(Integer.class)
                .single();

        // Then
        assertAll(
                () -> assertTrue(
                        columns.containsAll(List.of("id", "trip_id", "sender_id", "content", "sent_at")),
                        "V39 creates group message columns"),
                () -> assertEquals(1, tripIndex, "trip/sent_at index exists"),
                () -> assertEquals(List.of(6L, 92L), backfilledTrips,
                        "backfill covers seed full trip 6 and active custom trip 92 only"),
                () -> assertEquals("人齐了，群聊已开通，路线和集合细节在这里商量。", welcome,
                        "backfill writes the publisher welcome message"),
                () -> assertEquals(1L, welcomeSender, "welcome sender is the trip publisher"),
                () -> assertEquals("2026-11-12T09:00:00Z", welcomeSentAt,
                        "backfill timestamp precedes the fixed test clock"),
                () -> assertEquals(1, seedWelcomeCount, "each full trip gets exactly one welcome row"),
                () -> assertEquals(2, orderedIds.size(), "later member messages append after the welcome"),
                () -> assertEquals(900L, orderedIds.getLast(), "list ordering puts the newest message last"),
                () -> assertEquals(1, v39Applied, "V39 recorded in flyway history"));
    }

    private String toSqlitePath(Path path) {
        return path.toAbsolutePath().toString().replace('\\', '/');
    }
}