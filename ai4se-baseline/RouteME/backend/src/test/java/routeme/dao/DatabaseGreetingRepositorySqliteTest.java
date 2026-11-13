package routeme.dao;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.nio.file.Path;
import java.util.Optional;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import routeme.model.Greeting;

/**
 * 用临时 SQLite 文件库执行同一组迁移脚本，验证运行时数据库真的可用，
 * 而不是只在 H2 上通过。
 */
class DatabaseGreetingRepositorySqliteTest {

    @TempDir
    Path tempDirectory;

    @Test
    void in_emptySqliteFile_out_greetingSeeded() {
        // Given
        String databaseUrl = "jdbc:sqlite:" + toSqlitePath(tempDirectory.resolve("routeme.db"));
        Flyway.configure()
                .dataSource(databaseUrl, null, null)
                .locations("classpath:db/migration")
                .load()
                .migrate();
        JdbcClient jdbcClient = JdbcClient.create(new DriverManagerDataSource(databaseUrl));

        // When
        Optional<Greeting> greeting = new DatabaseGreetingRepository(jdbcClient).findGreeting();

        // Then
        assertEquals(Optional.of(new Greeting(1, "Hello World")), greeting);
    }

    private String toSqlitePath(Path path) {
        return path.toAbsolutePath().toString().replace('\\', '/');
    }
}
