package routeme.config;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/**
 * 固定测试时钟：2026-11-16T09:00:00Z（北京时间 17:00）。
 * 只由需要稳定四态/日期断言的测试类 @Import，避免影响生日年龄等既有用例。
 */
@TestConfiguration
public class FixedClockTestConfig {

    public static final Instant NOW = Instant.parse("2026-11-16T09:00:00Z");

    @Bean
    @Primary
    public Clock fixedClock() {
        return Clock.fixed(NOW, ZoneOffset.UTC);
    }
}
