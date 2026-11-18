package routeme.utils;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 退出证明图片的本地落盘：目录与文件名由服务端决定，上传文件名不参与路径。
 */
@Component
public class ExitEvidenceStorage {

    private static final Logger log = LoggerFactory.getLogger(ExitEvidenceStorage.class);

    private final Path directory;

    public ExitEvidenceStorage(
            @Value("${routeme.credit.exit-evidence-dir:../SqlLite/uploads/exit-evidence}") String directory) {
        this.directory = Path.of(directory).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.directory);
        } catch (IOException exception) {
            throw new UncheckedIOException("cannot create exit evidence directory " + this.directory, exception);
        }
    }

    /**
     * @return 服务端生成的文件名（不含目录）
     */
    public String store(long userId, long tripId, PhotoMagic.Format format, byte[] content) {
        String fileName = tripId + "-" + userId + "-"
                + UUID.randomUUID().toString().replace("-", "") + "." + format.extension();
        Path target = directory.resolve(fileName);
        try {
            Files.write(target, content);
        } catch (IOException exception) {
            throw new UncheckedIOException("cannot store exit evidence " + fileName, exception);
        }
        return fileName;
    }

    public Optional<byte[]> load(String fileName) {
        Path file = resolve(fileName);
        if (file == null) {
            return Optional.empty();
        }
        try {
            return Optional.of(Files.readAllBytes(file));
        } catch (IOException exception) {
            return Optional.empty();
        }
    }

    public boolean exists(String fileName) {
        Path file = resolve(fileName);
        return file != null && Files.isRegularFile(file);
    }

    public void deleteQuietly(String fileName) {
        Path file = resolve(fileName);
        if (file == null) {
            return;
        }
        try {
            Files.deleteIfExists(file);
        } catch (IOException exception) {
            log.warn("cannot delete exit evidence file {}", fileName);
        }
    }

    private Path resolve(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return null;
        }
        Path file = directory.resolve(fileName).normalize();
        return file.startsWith(directory) ? file : null;
    }
}
