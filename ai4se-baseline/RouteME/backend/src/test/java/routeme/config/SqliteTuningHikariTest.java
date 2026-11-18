package routeme.config;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Path;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import com.zaxxer.hikari.HikariDataSource;

/**
 * 回归：并发「先读后写」事务（保存 AI 快照 / 发布行程的真实形态）不应再抛 SQLITE_BUSY。
 *
 * <p>修复前 12 个并发保存只有 1–2 个成功，其余都是 500 INTERNAL_ERROR，
 * 前端展示「保存失败，请重试。」。
 */
class SqliteTuningHikariTest {

    private static final int THREADS = 8;

    @TempDir
    Path tempDirectory;

    @Test
    void tunedPool_usesWalAndSurvivesConcurrentReadThenWrite() throws Exception {
        Path database = tempDirectory.resolve("routeme.db");
        try (HikariDataSource dataSource = tunedPool(database)) {
            try (Connection connection = dataSource.getConnection()) {
                try (Statement statement = connection.createStatement()) {
                    statement.execute("CREATE TABLE snapshot (id INTEGER PRIMARY KEY, payload TEXT)");
                }
                assertAll(
                        () -> assertEquals("wal", pragma(connection, "journal_mode"), "journal_mode"),
                        () -> assertEquals("5000", pragma(connection, "busy_timeout"), "busy_timeout"));
            }

            List<String> failures = new CopyOnWriteArrayList<>();
            CountDownLatch start = new CountDownLatch(1);
            List<Thread> threads = new ArrayList<>();
            for (int index = 0; index < THREADS; index++) {
                int slot = index;
                Thread thread = new Thread(() -> {
                    try {
                        start.await();
                        readThenWrite(dataSource, slot);
                    } catch (Exception exception) {
                        failures.add(exception.getClass().getSimpleName() + ": " + exception.getMessage());
                    }
                });
                threads.add(thread);
                thread.start();
            }
            start.countDown();
            for (Thread thread : threads) {
                thread.join();
            }

            assertTrue(failures.isEmpty(), "concurrent saves must not fail, got " + failures);
            assertEquals(THREADS, countRows(dataSource), "every concurrent save persisted");
        }
    }

    /** 复刻 saveSnapshot：事务内先 SELECT max(id) 再 INSERT。 */
    private void readThenWrite(HikariDataSource dataSource, int slot) throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try (PreparedStatement max = connection.prepareStatement("SELECT max(id) FROM snapshot");
                    ResultSet rs = max.executeQuery()) {
                rs.next();
                long next = rs.getLong(1) + 1;
                try (PreparedStatement insert =
                        connection.prepareStatement("INSERT INTO snapshot (id, payload) VALUES (?, ?)")) {
                    insert.setLong(1, next);
                    insert.setString(2, "slot-" + slot);
                    insert.executeUpdate();
                }
            }
            connection.commit();
        }
    }

    private HikariDataSource tunedPool(Path database) {
        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setJdbcUrl("jdbc:sqlite:" + database.toAbsolutePath().toString().replace('\\', '/'));
        dataSource.setMaximumPoolSize(4);
        SqliteTuning.tune(dataSource);
        return dataSource;
    }

    private String pragma(Connection connection, String name) throws Exception {
        try (Statement statement = connection.createStatement();
                ResultSet rs = statement.executeQuery("PRAGMA " + name)) {
            rs.next();
            return String.valueOf(rs.getString(1)).toLowerCase();
        }
    }

    private int countRows(HikariDataSource dataSource) throws Exception {
        try (Connection connection = dataSource.getConnection();
                Statement statement = connection.createStatement();
                ResultSet rs = statement.executeQuery("SELECT count(*) FROM snapshot")) {
            rs.next();
            return rs.getInt(1);
        }
    }
}