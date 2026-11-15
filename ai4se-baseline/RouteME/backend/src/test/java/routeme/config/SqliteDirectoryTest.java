package routeme.config;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class SqliteDirectoryTest {

    @TempDir
    Path tempDirectory;

    @Test
    void in_missingParent_out_created() {
        // Given
        Path database = tempDirectory.resolve("nested/SqlLite/routeme.db");

        // When
        SqliteDirectory.ensure("jdbc:sqlite:" + toSlashPath(database));

        // Then
        assertTrue(Files.isDirectory(database.getParent()), "parent directory created");
    }

    @Test
    void in_existingParent_out_leftUntouched() throws IOException {
        // Given
        Path database = tempDirectory.resolve("routeme.db");
        Files.createFile(database);

        // When
        SqliteDirectory.ensure("jdbc:sqlite:" + toSlashPath(database));

        // Then
        assertAll(
                () -> assertTrue(Files.isRegularFile(database), "existing file kept"),
                () -> assertTrue(Files.isDirectory(tempDirectory), "directory kept"));
    }

    @Test
    void in_nonFileLocations_out_ignored() {
        assertAll(
                () -> assertNull(SqliteDirectory.parentDirectoryOf("jdbc:h2:mem:routeme"), "H2 ignored"),
                () -> assertNull(SqliteDirectory.parentDirectoryOf("jdbc:sqlite::memory:"), "in-memory ignored"),
                () -> assertNull(SqliteDirectory.parentDirectoryOf(null), "null ignored"));
    }

    private String toSlashPath(Path path) {
        return path.toAbsolutePath().toString().replace('\\', '/');
    }
}