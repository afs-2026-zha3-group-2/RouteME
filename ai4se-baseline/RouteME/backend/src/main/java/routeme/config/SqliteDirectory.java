package routeme.config;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * SQLite 不能自动创建缺失的父目录，缺目录时 Flyway 会直接抛 SQLITE_CANTOPEN。
 * 启动前按数据源 URL 建好目录，让首次运行（尤其是独立 jar）不依赖手工 mkdir。
 */
public final class SqliteDirectory {

    /** 与 application.yaml 的默认值保持一致：从 backend 目录启动时指向 RouteME/SqlLite。 */
    static final String DEFAULT_URL = "jdbc:sqlite:../SqlLite/routeme.db";

    private SqliteDirectory() {
    }

    public static void ensureForEnvironment() {
        ensure(System.getenv("SPRING_DATASOURCE_URL"));
    }

    /**
     * @param url 数据源 URL；为空白时按默认值处理；非 SQLite 文件库（H2、:memory:）直接跳过
     */
    public static void ensure(String url) {
        Path directory = parentDirectoryOf(url == null || url.isBlank() ? DEFAULT_URL : url);
        if (directory == null) {
            return;
        }
        try {
            Files.createDirectories(directory);
        } catch (IOException exception) {
            throw new UncheckedIOException("cannot create SQLite directory " + directory, exception);
        }
    }

    static Path parentDirectoryOf(String url) {
        String trimmed = url == null ? "" : url.trim();
        String prefix = "jdbc:sqlite:";
        if (!trimmed.startsWith(prefix)) {
            return null;
        }
        String location = trimmed.substring(prefix.length());
        if (location.isBlank() || location.contains(":memory:") || location.startsWith("file:")) {
            return null;
        }
        Path file = Path.of(location).toAbsolutePath().normalize();
        Path parent = file.getParent();
        return parent == null || Files.isDirectory(parent) ? null : parent;
    }
}