package routeme.utils;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

/**
 * 通知文案只在后端生成；四类事件与未知类型的回退都必须稳定。
 */
class NotificationTextUtilsTest {

    @Test
    void in_fourTypes_out_chineseText() {
        // Given
        String actor = "小周";
        String trip = "周末去珠海骑行";

        // When / Then
        assertAll(
                () -> assertEquals(
                        "「小周」申请加入「周末去珠海骑行」",
                        NotificationTextUtils.text("application_received", actor, trip)),
                () -> assertEquals(
                        "「小周」接受了你的申请（「周末去珠海骑行」）",
                        NotificationTextUtils.text("application_accepted", actor, trip)),
                () -> assertEquals(
                        "「小周」拒绝了你的申请（「周末去珠海骑行」）",
                        NotificationTextUtils.text("application_rejected", actor, trip)),
                () -> assertEquals(
                        "「小周」发来一条消息（「周末去珠海骑行」）",
                        NotificationTextUtils.text("message", actor, trip)));
    }

    @Test
    void in_titleWithBrackets_out_notEscapedAgain() {
        // Given
        String trip = "「五一」去澳门";

        // When
        String text = NotificationTextUtils.text("message", "阿岚", trip);

        // Then
        assertEquals("「阿岚」发来一条消息（「「五一」去澳门」）", text, "title is embedded verbatim");
    }

    @Test
    void in_unknownType_out_fallbackText() {
        // Given / When / Then
        assertAll(
                () -> assertEquals("你有一条新通知", NotificationTextUtils.text("unknown_type", "小周", "周末去珠海骑行")),
                () -> assertEquals("你有一条新通知", NotificationTextUtils.text(null, null, null)));
    }
}