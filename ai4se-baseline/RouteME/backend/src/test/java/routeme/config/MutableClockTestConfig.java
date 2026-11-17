package routeme.config;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/**
 * 可推进的测试时钟：跨自然月的配额与恢复用例需要把时间拨到下个月。
 * 只用 {@code @Import} 的类可见，不影响既有固定时钟用例。
 */
@TestConfiguration
public class MutableClockTestConfig {

    @Bean
    @Primary
    public MutableClock mutableClock() {
        return new MutableClock(Instant.parse("2026-11-16T09:00:00Z"), ZoneOffset.UTC);
    }

    /**
     * 手动拨动的时钟：{@link #set(Instant)} 之后所有取时都按新时刻。
     */
    public static final class MutableClock extends Clock {

        private Instant instant;
        private final ZoneId zone;

        public MutableClock(Instant instant, ZoneId zone) {
            this.instant = instant;
            this.zone = zone;
        }

        public void set(Instant next) {
            this.instant = next;
        }

        @Override
        public ZoneId getZone() {
            return zone;
        }

        @Override
        public Clock withZone(ZoneId nextZone) {
            return new MutableClock(instant, nextZone);
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }
}
