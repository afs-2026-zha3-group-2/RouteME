package routeme.utils;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class ExperiencePhotoStorageTest {

    @TempDir
    Path tempDirectory;

    @Test
    void in_uploadedBytes_out_serverNamedFileReadableAndDeletable() {
        // Given
        ExperiencePhotoStorage storage = new ExperiencePhotoStorage(tempDirectory.toString());
        byte[] content = new byte[]{1, 2, 3, 4};

        // When
        String fileName = storage.store(7, 9, PhotoMagic.Format.PNG, content);

        // Then
        assertTrue(fileName.matches("7-9-[0-9a-f]{32}\\.png"), "server-side file name");
        assertArrayEquals(content, storage.load(fileName).orElseThrow(), "stored bytes readable");

        storage.deleteQuietly(fileName);
        assertTrue(storage.load(fileName).isEmpty(), "file deleted");
    }

    @Test
    void in_pathTraversalName_out_empty() {
        ExperiencePhotoStorage storage = new ExperiencePhotoStorage(tempDirectory.toString());

        assertTrue(storage.load("../escape.jpg").isEmpty());
        assertTrue(storage.load(null).isEmpty());
        assertTrue(storage.load(" ").isEmpty());
    }
}
