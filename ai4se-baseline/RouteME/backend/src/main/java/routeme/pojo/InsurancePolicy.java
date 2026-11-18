package routeme.pojo;

import java.time.Instant;
import java.time.LocalDate;

import routeme.constant.TripTimeZoneConstant;

/**
 * 第三方保险状态记录：RouteMe 只保存行程关联、服务提供方与保障期，
 * 不保存身份证号、银行卡号或保单号等投保敏感信息。
 *
 * <p>{@code EXPIRED} 由保障结束日只读派生，不落库。</p>
 */
public record InsurancePolicy(
        long id,
        long userId,
        long tripId,
        String provider,
        LocalDate coverageStart,
        LocalDate coverageEnd,
        String storedStatus,
        Instant confirmedAt) {

    public static final String STATUS_ACTIVE = "ACTIVE";

    public static final String WIRE_NOT_PURCHASED = "not_purchased";
    public static final String WIRE_ACTIVE = "active";
    public static final String WIRE_EXPIRED = "expired";

    /** 契约状态：保障结束日（含）之前为 active，之后为 expired。 */
    public String wireStatus(Instant now) {
        return LocalDate.ofInstant(now, TripTimeZoneConstant.ZONE).isAfter(coverageEnd)
                ? WIRE_EXPIRED
                : WIRE_ACTIVE;
    }
}