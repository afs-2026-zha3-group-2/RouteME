package routeme.migration;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Path;
import java.util.List;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

/**
 * Verifies V33 adds the notifications table, the recipient/read index and the
 * (recipient, dedupe_key) unique index on SQLite, and that the table supports the
 * insert / list / mark-read statements the notification service relies on.
 */
class NotificationMigrationSqliteTest {

    @TempDir
    Path tempDirectory;

    @Test
    void in_emptySqliteFile_out_notificationSchema() {
        // Given
        String databaseUrl = "jdbc:sqlite:" + toSqlitePath(tempDirectory.resolve("routeme.db"));
        Flyway.configure()
                .dataSource(databaseUrl, null, null)
                .locations("classpath:db/migration")
                .load()
                .migrate();
        JdbcClient jdbcClient = JdbcClient.create(new DriverManagerDataSource(databaseUrl));

        // When
        List<String> columns = jdbcClient.sql("SELECT name FROM pragma_table_info('notifications')")
                .query(String.class)
                .list();
        List<String> notNullColumns = jdbcClient.sql("""
                SELECT name FROM pragma_table_info('notifications')
                 WHERE "notnull" = 1
                """).query(String.class).list();
        int readIndex = jdbcClient.sql("""
                SELECT COUNT(*) FROM sqlite_master
                 WHERE type = 'index' AND name = 'ix_notifications_recipient_read'
                """).query(Integer.class).single();
        int dedupeIndex = jdbcClient.sql("""
                SELECT COUNT(*) FROM sqlite_master
                 WHERE type = 'index' AND name = 'ux_notifications_recipient_dedupe'
                """).query(Integer.class).single();
        jdbcClient.sql("""
                INSERT INTO notifications
                    (id, recipient_id, type, event, title, content, priority,
                     actor_id, trip_id, application_id, message_id, report_id, session_id,
                     dedupe_key, created_at, read_at)
                VALUES
                    (900, 7, 'APPLICATION', 'application_received', '新的同行申请',
                     '「小周」申请加入「周末去珠海骑行」，请及时处理。', 'NORMAL',
                     8, 3, 41, NULL, NULL, NULL, 'application_received:41',
                     '2026-11-17T09:00:00Z', NULL),
                    (901, 7, 'CHAT', 'message', '新的同行消息',
                     '「小周」发来一条消息（「周末去珠海骑行」）。', 'NORMAL',
                     8, 3, NULL, 55, NULL, NULL, 'message:55',
                     '2026-11-17T09:05:00Z', NULL)
                """).update();
        int unread = jdbcClient.sql("SELECT COUNT(*) FROM notifications WHERE recipient_id = 7 AND read_at IS NULL")
                .query(Integer.class)
                .single();
        int chatUnread = jdbcClient.sql("""
                SELECT COUNT(*) FROM notifications
                 WHERE recipient_id = 7 AND type = 'CHAT' AND read_at IS NULL
                """).query(Integer.class).single();
        List<Long> orderedIds = jdbcClient.sql("""
                SELECT id FROM notifications
                 WHERE recipient_id = 7
                 ORDER BY created_at DESC, id DESC
                """).query(Long.class).list();
        assertThrows(RuntimeException.class, () -> jdbcClient.sql("""
                INSERT INTO notifications
                    (id, recipient_id, type, event, title, content, priority,
                     dedupe_key, created_at)
                VALUES
                    (902, 7, 'APPLICATION', 'application_received', 'dup', 'dup', 'NORMAL',
                     'application_received:41', '2026-11-17T09:06:00Z')
                """).update(), "same event is rejected by the unique dedupe index");
        jdbcClient.sql("""
                UPDATE notifications SET read_at = '2026-11-17T09:10:00Z'
                 WHERE id = 901 AND recipient_id = 7 AND read_at IS NULL
                """).update();
        jdbcClient.sql("""
                UPDATE notifications SET read_at = '2026-11-17T09:11:00Z'
                 WHERE id = 901 AND recipient_id = 7 AND read_at IS NULL
                """).update();
        String readAt = jdbcClient.sql("SELECT read_at FROM notifications WHERE id = 901")
                .query(String.class)
                .single();
        int remaining = jdbcClient.sql("SELECT COUNT(*) FROM notifications WHERE recipient_id = 7 AND read_at IS NULL")
                .query(Integer.class)
                .single();
        int v33Applied = jdbcClient.sql(
                        "SELECT COUNT(*) FROM flyway_schema_history WHERE version = '33' AND success = 1")
                .query(Integer.class)
                .single();

        // Then
        assertAll(
                () -> assertTrue(
                        columns.containsAll(List.of(
                                "id", "recipient_id", "type", "event", "title", "content",
                                "priority", "actor_id", "trip_id", "application_id", "message_id",
                                "report_id", "session_id", "dedupe_key", "created_at", "read_at")),
                        "V33 creates notification columns"),
                () -> assertTrue(
                        notNullColumns.containsAll(List.of(
                                "id", "recipient_id", "type", "event", "title", "content",
                                "priority", "dedupe_key", "created_at")),
                        "required columns are NOT NULL"),
                () -> assertEquals(1, readIndex, "recipient/read index exists"),
                () -> assertEquals(1, dedupeIndex, "recipient/dedupe unique index exists"),
                () -> assertEquals(2, unread, "new rows start unread"),
                () -> assertEquals(1, chatUnread, "unread counts split by type"),
                () -> assertEquals(List.of(901L, 900L), orderedIds, "list orders newest first"),
                () -> assertEquals("2026-11-17T09:10:00Z", readAt, "repeated mark-read keeps the first timestamp"),
                () -> assertEquals(1, remaining, "mark-read only clears the targeted row"),
                () -> assertEquals(1, v33Applied, "V33 recorded in flyway history"));
    }

    private String toSqlitePath(Path path) {
        return path.toAbsolutePath().toString().replace('\\', '/');
    }
}