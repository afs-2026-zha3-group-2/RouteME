package routeme.utils;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 进程内带 TTL 的有界缓存。
 *
 * <p>用于缓存上游只读数据（天气、地图检索与路线等）：命中直接返回，过期后下一次访问
 * 重新拉取。调用方只应写入成功结果，失败不要写入，让用户重试可以真正打到上游。</p>
 *
 * <p>容量按「最早过期」淘汰：写入前先清掉过期项，仍超限时移除最早到期的条目，
 * 避免长时间运行后无限增长。{@code ttl <= 0} 或 {@code maxEntries <= 0} 时缓存关闭，
 * 读永远未命中、写直接忽略，便于测试或临时降级。</p>
 *
 * @param <K> 缓存键
 * @param <V> 缓存值
 */
public final class TtlCache<K, V> {

    private final Duration ttl;
    private final int maxEntries;
    private final Clock clock;
    private final boolean enabled;
    private final Map<K, Entry<V>> entries = new ConcurrentHashMap<>();

    /**
     * @param ttl        条目存活时间；空或非正数表示关闭缓存
     * @param maxEntries 最大条目数；非正数表示关闭缓存
     * @param clock      时间源；测试可注入可控时钟
     */
    public TtlCache(Duration ttl, int maxEntries, Clock clock) {
        this.ttl = ttl == null ? Duration.ZERO : ttl;
        this.maxEntries = maxEntries;
        this.clock = clock == null ? Clock.systemUTC() : clock;
        this.enabled = !this.ttl.isZero() && !this.ttl.isNegative() && maxEntries > 0;
    }

    /** 缓存是否启用。 */
    public boolean isEnabled() {
        return enabled;
    }

    /**
     * 读取未过期条目。
     *
     * @param key 缓存键
     * @return 命中值；未命中或已过期返回 {@code null}
     */
    public V get(K key) {
        if (!enabled || key == null) {
            return null;
        }
        Entry<V> entry = entries.get(key);
        if (entry == null) {
            return null;
        }
        if (!entry.expiresAt().isAfter(clock.instant())) {
            entries.remove(key, entry);
            return null;
        }
        return entry.value();
    }

    /**
     * 写入或覆盖条目；值为 {@code null} 时忽略。
     *
     * @param key   缓存键
     * @param value 缓存值
     */
    public void put(K key, V value) {
        if (!enabled || key == null || value == null) {
            return;
        }
        evictIfNeeded();
        entries.put(key, new Entry<>(value, clock.instant().plus(ttl)));
    }

    /**
     * 清空全部条目。
     *
     * @return 被清掉的条目数
     */
    public int clear() {
        int cleared = entries.size();
        entries.clear();
        return cleared;
    }

    /** 当前条目数（含已过期但尚未被清理的条目）。 */
    public int size() {
        return entries.size();
    }

    private void evictIfNeeded() {
        if (entries.size() < maxEntries) {
            return;
        }
        Instant now = clock.instant();
        entries.entrySet().removeIf(entry -> !entry.getValue().expiresAt().isAfter(now));
        while (entries.size() >= maxEntries) {
            K earliestKey = null;
            Instant earliestExpiry = null;
            for (Map.Entry<K, Entry<V>> candidate : entries.entrySet()) {
                Instant expiry = candidate.getValue().expiresAt();
                if (earliestKey == null || expiry.isBefore(earliestExpiry)) {
                    earliestKey = candidate.getKey();
                    earliestExpiry = expiry;
                }
            }
            if (earliestKey == null) {
                return;
            }
            entries.remove(earliestKey);
        }
    }

    private record Entry<V>(V value, Instant expiresAt) {
    }
}