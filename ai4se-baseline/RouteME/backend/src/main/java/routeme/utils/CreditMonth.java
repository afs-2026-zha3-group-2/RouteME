package routeme.utils;

import java.time.Instant;
import java.time.YearMonth;

import routeme.constant.TripTimeZoneConstant;

/**
 * 自然月键：一律按北京时间（{@link TripTimeZoneConstant#ZONE}）换算，格式 `YYYY-MM`。
 *
 * <p>考试次数与恢复幂等键共用同一个键，避免 UTC 与本地时区在月末跨出两个真相。</p>
 */
public final class CreditMonth {

    private CreditMonth() {
    }

    public static String monthKey(Instant instant) {
        return YearMonth.from(instant.atZone(TripTimeZoneConstant.ZONE)).toString();
    }
}
