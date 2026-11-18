package routeme.service;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import routeme.enums.CreditExitReasonEnum;
import routeme.pojo.CreditExitEvent;
import routeme.pojo.CreditExitPreview;
import routeme.pojo.CreditExitResult;
import routeme.pojo.LeaveEvidenceFile;
import routeme.response.LeaveEvidenceResponse;
import routeme.response.LeaveRecordResponse;

/**
 * 信用执行：退出预览 / 结算 / 待核实复核 / 限制查询 / 退出证明材料。
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
     * 上传退出证明图片：只落盘 + 元数据，退出提交时再绑定到退出事件。
     */
    LeaveEvidenceResponse uploadEvidence(long tripId, long userId, MultipartFile file);

    /**
     * 退出并结算：解除同行关系、写账本与退出事件；note 为退出说明，
     * attachmentIds 为已上传的证明图片。
     */
    CreditExitResult leave(
            long tripId,
            long userId,
            CreditExitReasonEnum reason,
            String note,
            List<Long> attachmentIds);

    /**
     * 本人查看自己的全部退出记录（原因 / 说明 / 影响 / 证明材料），按时间倒序；无记录返回 404。
     */
    List<LeaveRecordResponse> leaveRecords(long tripId, long userId);

    /**
     * 读取本人证明材料；非本人返回 403，记录或文件不存在返回 404。
     */
    LeaveEvidenceFile loadEvidence(long attachmentId, long userId);

    /**
     * 未来核实：领域方法，无 controller；核实为真不扣分，为不属实按实际退出时间补扣。
     */
    CreditExitEvent reviewExit(long exitEventId, boolean upheld);

    /**
     * 当前用户是否受限（分数 <60 或存在 active 限制记录）。
     */
    boolean isRestricted(long userId);
}
