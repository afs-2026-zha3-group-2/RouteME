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
 * Verifies V30 adds the notifications table and the recipient/read index on SQLite, and that the
 * table supports the insert / list / mark-read statements the notification service relies on.
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
        jdbcClient.sql("""
                INSERT INTO notifications
                    (id, recipient_id, type, actor_id, trip_id, application_id, message_id, created_at, read_at)
                VALUES
                    (900, 7, 'application_received', 8, 3, 41, NULL, '2026-11-17T09:00:00Z', NULL),
                    (901, 7, 'message', 8, 3, NULL, 55, '2026-11-17T09:05:00Z', NULL)
                """).update();
        int unread = jdbcClient.sql("SELECT COUNT(*) FROM notifications WHERE recipient_id = 7 AND read_at IS NULL")
                .query(Integer.class)
                .single();
        int messageUnread = jdbcClient.sql("""
                SELECT COUNT(*) FROM notifications
                 WHERE recipient_id = 7 AND type = 'message' AND read_at IS NULL
                """).query(Integer.class).single();
        List<Long> orderedIds = jdbcClient.sql("""
                SELECT id FROM notifications
                 WHERE recipient_id = 7
                 ORDER BY created_at DESC, id DESC
                """).query(Long.class).list();
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
        int v24Applied = jdbcClient.sql(
                        "SELECT COUNT(*) FROM flyway_schema_history WHERE version = '24' AND success = 1")
                .query(Integer.class)
                .single();

        // Then
        assertAll(
                () -> assertTrue(
                        columns.containsAll(List.of(
                                "id", "recipient_id", "type", "actor_id", "trip_id",
                                "application_id", "message_id", "created_at", "read_at")),
                        "V30 creates notification columns"),
                () -> assertTrue(
                        notNullColumns.containsAll(List.of(
                                "id", "recipient_id", "type", "actor_id", "trip_id", "created_at")),
                        "required columns are NOT NULL"),
                () -> assertEquals(1, readIndex, "recipient/read index exists"),
                () -> assertEquals(2, unread, "new rows start unread"),
                () -> assertEquals(1, messageUnread, "unread counts split by type"),
                () -> assertEquals(List.of(901L, 900L), orderedIds, "list orders newest first"),
                () -> assertEquals("2026-11-17T09:10:00Z", readAt, "repeated mark-read keeps the first timestamp"),
                () -> assertEquals(1, remaining, "mark-read only clears the targeted row"),
                () -> assertEquals(1, v24Applied, "V30 recorded in flyway history"));
    }

    private String toSqlitePath(Path path) {
        return path.toAbsolutePath().toString().replace('\\', '/');
    }
}