package routeme.utils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

/**
 * {@link TtlCache} 的过期、关闭与容量淘汰规则。
 */
class TtlCacheTest {

    @Test
    void in_valueWithinTtl_out_hits() {
        MutableClock clock = new MutableClock(Instant.parse("2026-11-18T00:00:00Z"));
        TtlCache<String, String> cache = new TtlCache<>(Duration.ofMinutes(30), 10, clock);

        cache.put("k", "v");
        clock.advance(Duration.ofMinutes(29));

        assertEquals("v", cache.get("k"));
        assertEquals(1, cache.size());
    }

    @Test
    void in_valuePastTtl_out_missesAndDrops() {
        MutableClock clock = new MutableClock(Instant.parse("2026-11-18T00:00:00Z"));
        TtlCache<String, String> cache = new TtlCache<>(Duration.ofMinutes(30), 10, clock);

        cache.put("k", "v");
        clock.advance(Duration.ofMinutes(31));

        assertNull(cache.get("k"), "expired entries must not be served");
        assertEquals(0, cache.size(), "expired entry should be evicted on read");
    }

    @Test
    void in_zeroTtl_out_cacheDisabled() {
        TtlCache<String, String> cache = new TtlCache<>(Duration.ZERO, 10, Clock.systemUTC());

        assertFalse(cache.isEnabled());
        cache.put("k", "v");
        assertNull(cache.get("k"));
    }

    @Test
    void in_nullValues_out_notStored() {
        TtlCache<String, String> cache = new TtlCache<>(Duration.ofMinutes(5), 10, Clock.systemUTC());

        cache.put("k", null);

        assertNull(cache.get("k"));
        assertEquals(0, cache.size());
    }

    @Test
    void in_overflow_out_evictsEntryClosestToExpiry() {
        MutableClock clock = new MutableClock(Instant.parse("2026-11-18T00:00:00Z"));
        TtlCache<String, String> cache = new TtlCache<>(Duration.ofMinutes(30), 2, clock);

        cache.put("old", "1");
        clock.advance(Duration.ofMinutes(1));
        cache.put("new", "2");
        clock.advance(Duration.ofMinutes(1));
        cache.put("newest", "3");

        assertTrue(cache.size() <= 2, "cache must stay within max entries");
        assertNull(cache.get("old"), "entry closest to expiry is dropped first");
        assertEquals("3", cache.get("newest"));
    }

    @Test
    void clear_out_removesEverything() {
        TtlCache<String, String> cache = new TtlCache<>(Duration.ofMinutes(5), 10, Clock.systemUTC());
        cache.put("a", "1");
        cache.put("b", "2");

        assertEquals(2, cache.clear());
        assertEquals(0, cache.size());
    }

    /** 可控时钟：避免单测真实等待 TTL 到期。 */
    private static final class MutableClock extends Clock {

        private Instant now;

        private MutableClock(Instant now) {
            this.now = now;
        }

        private void advance(Duration duration) {
            now = now.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}