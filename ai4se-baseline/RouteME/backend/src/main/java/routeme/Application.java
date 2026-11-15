package routeme;

import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.SpringApplication;
import routeme.config.SqliteDirectory;

@SpringBootApplication
public class Application {

    public static void main(String[] args) {
        SqliteDirectory.ensureForEnvironment();
        SpringApplication.run(Application.class, args);
    }
}
