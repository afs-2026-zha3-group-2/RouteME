package routeme.service;

import java.time.Instant;

import routeme.enums.TripStatusEnum;
import routeme.pojo.TripPlan;

/**
 * 旅行保障资格派生（design D7）：只有行程发布者或 {@code ACCEPTED} 同行者，
 * 且行程状态为 recruiting / full / ongoing 时才可交易。
 *
 * <p>无资格原因只区分「不是同行者」与「行程已关闭」两种，便于页面解释；
 * 账号状态不参与派生，写端点会另行返回 403 {@code ACCOUNT_*}。</p>
 */
public record FinanceEligibility(boolean eligible, String ineligibleReason) {

    public static final String NOT_PARTICIPANT = "not_participant";
    public static final String TRIP_CLOSED = "trip_closed";

    public static FinanceEligibility evaluate(TripPlan trip, long userId, boolean accepted, Instant now) {
        if (trip.publisherId() != userId && !accepted) {
            return new FinanceEligibility(false, NOT_PARTICIPANT);
        }
        TripStatusEnum status = trip.status(now);
        if (status != TripStatusEnum.RECRUITING
                && status != TripStatusEnum.FULL
                && status != TripStatusEnum.ONGOING) {
            return new FinanceEligibility(false, TRIP_CLOSED);
        }
        return new FinanceEligibility(true, null);
    }
}