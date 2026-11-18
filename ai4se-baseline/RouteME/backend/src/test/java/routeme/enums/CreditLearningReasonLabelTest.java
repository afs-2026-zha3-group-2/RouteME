package routeme.enums;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

import routeme.constant.CreditLearningConstant;

/**
 * A17：恢复记录的原因码文案（本变更不开放读账本端点，故在单测锁定映射）。
 */
class CreditLearningReasonLabelTest {

    @Test
    void in_recoveryCode_out_chineseLabel() {
        assertEquals("安全学习信用恢复",
                CreditReason.labelOf(CreditLearningConstant.REASON_SAFETY_LEARNING_RECOVERY));
        assertEquals("安全学习信用恢复", CreditReason.SAFETY_LEARNING_RECOVERY.label());
    }

    @Test
    void in_unregisteredCode_out_fallsBackToCode() {
        assertEquals("FUTURE_EVENT", CreditReason.labelOf("FUTURE_EVENT"), "unknown reason keeps its code");
    }
}
