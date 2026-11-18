package routeme.config;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import org.junit.jupiter.api.Test;

class SqliteTuningTest {

    @Test
    void fileSqlite_isTuned_fileMemoryAndOtherDrivers_areNot() {
        assertAll(
                () -> assertTrue(SqliteTuning.isFileSqlite("jdbc:sqlite:../SqlLite/routeme.db")),
                () -> assertTrue(SqliteTuning.isFileSqlite(" JDBC:SQLITE:./routeme.db ")),
                () -> assertFalse(SqliteTuning.isFileSqlite("jdbc:sqlite::memory:")),
                () -> assertFalse(SqliteTuning.isFileSqlite("jdbc:h2:mem:routeme")),
                () -> assertFalse(SqliteTuning.isFileSqlite(null)));
    }

    @Test
    void pragmasFor_emptyInput_appliesImmediateTransactionMode() {
        Map<String, String> pragmas = SqliteTuning.pragmasFor(Map.of());

        assertAll(
                // 写锁在 BEGIN 时获取，是并发保存不再 SQLITE_BUSY 的关键。
                () -> assertEquals("IMMEDIATE", pragmas.get("transaction_mode")),
                () -> assertEquals("WAL", pragmas.get("journal_mode")),
                () -> assertEquals("NORMAL", pragmas.get("synchronous")),
                () -> assertEquals(SqliteTuning.BUSY_TIMEOUT_MS, pragmas.get("busy_timeout")));
    }

    @Test
    void pragmasFor_explicitValues_areKept() {
        Map<String, String> pragmas =
                SqliteTuning.pragmasFor(Map.of("busy_timeout", "1000", "Journal_Mode", "DELETE"));

        assertAll(
                () -> assertEquals("1000", pragmas.get("busy_timeout"), "user busy_timeout kept"),
                () -> assertEquals("DELETE", pragmas.get("journal_mode"), "user journal_mode kept"),
                () -> assertEquals("IMMEDIATE", pragmas.get("transaction_mode"), "defaults still filled"));
    }
}