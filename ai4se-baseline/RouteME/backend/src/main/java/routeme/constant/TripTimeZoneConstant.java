package routeme.constant;

import java.time.ZoneId;

/**
 * 行程业务日期使用的时区。
 *
 * <p>时间戳仍以 UTC 存储与传输；只有「开始日期 / 结束日期」到瞬时点的
 * 换算按中国标准时间解释，避免 UTC 凌晨边界把旅行日算错。</p>
 */
public final class TripTimeZoneConstant {

    public static final ZoneId ZONE = ZoneId.of("Asia/Shanghai");

    private TripTimeZoneConstant() {
    }
}
