package routeme.utils;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/**
 * 通知文案只在后端生成：标题与正文使用业务事实，未知原因码回退为原值。
 */
class NotificationTextUtilsTest {

    @Test
    void in_applicationEvents_out_titleAndContent() {
        // Given
        String actor = "小周";
        String trip = "周末去珠海骑行";

        // When
        NotificationTextUtils.Draft received =
                NotificationTextUtils.applicationReceived(actor, trip);
        NotificationTextUtils.Draft closed =
                NotificationTextUtils.applicationClosed(trip, "人数已满");

        // Then
        assertAll(
                () -> assertEquals("新的同行申请", received.title(), "title"),
                () -> assertEquals(
                        "「小周」申请加入「周末去珠海骑行」，请及时处理。",
                        received.content(),
                        "content embeds actor and trip"),
                () -> assertEquals("申请已关闭", closed.title(), "closed title"),
                () -> assertTrue(
                        closed.content().contains("人数已满"),
                        "closed content carries the cancel reason label"));
    }

    @Test
    void in_tripEvents_out_reasonIncluded() {
        // When
        NotificationTextUtils.Draft cancelled =
                NotificationTextUtils.tripCancelled("周末去珠海骑行", "天气突变");

        // Then
        assertAll(
                () -> assertEquals("行程已取消", cancelled.title(), "title"),
                () -> assertTrue(cancelled.content().contains("天气突变"), "cancel reason is shown"));
    }

    @Test
    void in_negativeCredit_out_deltaAndHighPriorityWording() {
        // When
        NotificationTextUtils.Draft low =
                NotificationTextUtils.creditChanged(-10, 55, "由于你在行程中退出同行", true);
        NotificationTextUtils.Draft normal =
                NotificationTextUtils.creditChanged(-5, 80, "由于你在出发前 48 小时内退出同行", false);

        // Then
        assertAll(
                () -> assertEquals("信用分 -10", low.title(), "negative delta title"),
                () -> assertTrue(low.content().contains("信用分扣除 10 分"), "delta"),
                () -> assertTrue(low.content().contains("当前信用分 55"), "resulting score"),
                () -> assertTrue(low.content().contains("信用限制"), "restriction hint"),
                () -> assertTrue(normal.content().contains("当前信用分 80"), "normal score"),
                () -> assertTrue(
                        !normal.content().contains("信用限制"),
                        "no restriction hint when the score is healthy"));
    }

    @Test
    void in_safetyLearningRecovery_out_recoveryCopy() {
        // When
        NotificationTextUtils.Draft recovered =
                NotificationTextUtils.creditRecovered(61, "完成安全学习");

        // Then
        assertAll(
                () -> assertEquals("信用分已恢复", recovered.title(), "title"),
                () -> assertTrue(recovered.content().contains("61"), "resulting score"),
                () -> assertTrue(recovered.content().contains("信用限制已解除"), "restriction lifted"));
    }

    @Test
    void in_accountBan_out_restrictionAndRecoveryTime() {
        // When
        NotificationTextUtils.Draft banned =
                NotificationTextUtils.accountBanned("骚扰他人", "2026-12-01T00:00:00Z");
        NotificationTextUtils.Draft permanent =
                NotificationTextUtils.accountBanned("发布虚假行程", null);

        // Then
        assertAll(
                () -> assertEquals("账号已被封禁", banned.title(), "title"),
                () -> assertTrue(banned.content().contains("骚扰他人"), "structured reason"),
                () -> assertTrue(banned.content().contains("恢复时间：2026-12-01T00:00:00Z"), "expiry"),
                () -> assertTrue(permanent.content().contains("永久封禁"), "permanent ban"));
    }

    @Test
    void in_reportResolved_out_noAdminNote() {
        // When
        NotificationTextUtils.Draft resolved = NotificationTextUtils.reportResolved(42, false);
        NotificationTextUtils.Draft rejected = NotificationTextUtils.reportResolved(43, true);

        // Then
        assertAll(
                () -> assertTrue(resolved.content().contains("R-42"), "report code"),
                () -> assertTrue(resolved.content().contains("采取措施"), "outcome"),
                () -> assertTrue(rejected.content().contains("未发现违规"), "rejected outcome"));
    }

    @Test
    void in_unknownReasonCode_out_verbatimFallback() {
        // When / Then
        assertAll(
                () -> assertEquals("NEW_REASON", NotificationTextUtils.creditReasonLabel("NEW_REASON")),
                () -> assertEquals("信用分发生变动", NotificationTextUtils.creditReasonLabel(null)),
                () -> assertEquals("未说明", NotificationTextUtils.cancelReasonLabel(null)));
    }
}