package routeme.pojo;

import java.time.Instant;

import routeme.enums.CreditRestrictionStatusEnum;
import routeme.enums.CreditRestrictionTypeEnum;

/**
 * 一段信用限制：active 期间用户只读；分数回到 ≥60 时 lifted。
 */
public record CreditRestriction(
        long id,
        long userId,
        CreditRestrictionTypeEnum type,
        String triggerReason,
        int triggerScore,
        Instant triggeredAt,
        CreditRestrictionStatusEnum status,
        Instant liftedAt,
        String liftReason,
        Long triggerLedgerId) {

    public boolean isActive() {
        return status == CreditRestrictionStatusEnum.ACTIVE;
    }
}
