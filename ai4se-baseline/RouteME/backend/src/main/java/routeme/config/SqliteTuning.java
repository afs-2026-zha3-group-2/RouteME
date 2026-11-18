package routeme.config;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Properties;

import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.zaxxer.hikari.HikariDataSource;

/**
 * SQLite 并发写入调优。
 *
 * <p>默认配置下 SQLite 只有一个写者，「先读后写」的事务（如 {@code saveSnapshot} 先取
 * max(id) 再 INSERT、发布行程先查再插）在并发时会立刻拿到 {@code SQLITE_BUSY}：
 * 延迟事务要升级写锁时若别的连接已经在写，SQLite 直接失败而不等待，{@code busy_timeout}
 * 对此无效。表现出来就是页面上的「保存失败，请重试。」（后端 500 INTERNAL_ERROR）。
 *
 * <p>实测（12 线程并发执行同样的读后写事务）：默认 1/12 成功、只加 WAL 2/12、
 * 只加 busy_timeout 2/12，加 {@code transaction_mode=IMMEDIATE} 后 12/12 成功。
 * IMMEDIATE 在 BEGIN 时就取写锁，busy_timeout 才能真正起到排队等待的作用。
 *
 * <p>只在数据源确实是文件型 SQLite 时生效：H2 测试库（内存库）不受影响，
 * 也不会给别的驱动塞未知属性。
 */
@Configuration
public class SqliteTuning {

    /** 写锁竞争时最多排队等待的毫秒数。 */
    static final String BUSY_TIMEOUT_MS = "5000";

    /**
     * 显式配置过的键保持用户值，只补齐缺省项，避免覆盖本地/测试的调优意图。
     */
    static Map<String, String> pragmasFor(Map<String, String> configured) {
        Map<String, String> defaults = new LinkedHashMap<>();
        // 写事务在 BEGIN 时即取锁，是消除 SQLITE_BUSY 的关键项。
        defaults.put("transaction_mode", "IMMEDIATE");
        // WAL 让读写不互相阻塞，写锁排队时读请求仍能完成。
        defaults.put("journal_mode", "WAL");
        defaults.put("synchronous", "NORMAL");
        defaults.put("busy_timeout", BUSY_TIMEOUT_MS);
        if (configured == null || configured.isEmpty()) {
            return defaults;
        }
        Map<String, String> merged = new LinkedHashMap<>(defaults);
        for (Map.Entry<String, String> entry : configured.entrySet()) {
            String key = entry.getKey() == null ? "" : entry.getKey().toLowerCase(Locale.ROOT);
            if (!key.isEmpty()) {
                merged.put(key, entry.getValue());
            }
        }
        return merged;
    }

    /** 文件型 SQLite 才需要调优：内存库天然单连接，不是 SQLite 的库一律放过。 */
    static boolean isFileSqlite(String jdbcUrl) {
        if (jdbcUrl == null) {
            return false;
        }
        String url = jdbcUrl.trim().toLowerCase(Locale.ROOT);
        return url.startsWith("jdbc:sqlite:") && !url.contains(":memory:");
    }

    static void tune(HikariDataSource dataSource) {
        if (!isFileSqlite(dataSource.getJdbcUrl())) {
            return;
        }
        Properties current = dataSource.getDataSourceProperties();
        Map<String, String> configured = new LinkedHashMap<>();
        if (current != null) {
            for (String name : current.stringPropertyNames()) {
                configured.put(name, current.getProperty(name));
            }
        }
        Properties tuned = new Properties();
        tuned.putAll(pragmasFor(configured));
        dataSource.setDataSourceProperties(tuned);
    }

    /**
     * Hikari 在首次取连接时才建池，因此在这里改属性仍会作用到之后所有连接。
     * 用静态 @Bean 保证它在数据源被注入使用前就注册好。
     */
    @Bean
    static BeanPostProcessor sqliteTuningPostProcessor() {
        return new BeanPostProcessor() {
            @Override
            public Object postProcessBeforeInitialization(Object bean, String beanName) {
                if (bean instanceof HikariDataSource hikari) {
                    tune(hikari);
                }
                return bean;
            }
        };
    }
}