package routeme.service;

import routeme.enums.CreditExitReasonEnum;
import routeme.pojo.CreditExitEvent;
import routeme.pojo.CreditExitPreview;
import routeme.pojo.CreditExitResult;

/**
 * 信用执行：退出预览 / 结算 / 待核实复核 / 限制查询。
 *
 * <p>退出与复核都写信用账本与退出事件；限制触发 / 解除由
 * {@link CreditChangedEvent} 同步监听，同一事务内完成。</p>
 */
public interface CreditEnforcementService {

    /**
     * 退出前预览：只读，不写库；受限账号抛 403 CREDIT_RESTRICTED。
     */
    CreditExitPreview previewExit(long tripId, long userId, CreditExitReasonEnum reason);

    /**
     * 退出并结算：解除同行关系、写账本与退出事件；返回实际结果。
     */
    CreditExitResult leave(long tripId, long userId, CreditExitReasonEnum reason);

    /**
     * 未来核实：领域方法，无 controller；核实为真不扣分，为不属实按实际退出时间补扣。
     */
    CreditExitEvent reviewExit(long exitEventId, boolean upheld);

    /**
     * 当前用户是否受限（分数 <60 或存在 active 限制记录）。
     */
    boolean isRestricted(long userId);
}
