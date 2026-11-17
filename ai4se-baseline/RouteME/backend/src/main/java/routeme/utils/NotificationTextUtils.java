package routeme.utils;

/**
 * 通知文案。文案只由后端生成，前端直接展示 {@code text}，不再拼接。
 */
public final class NotificationTextUtils {

    public static final String FALLBACK = "你有一条新通知";

    private NotificationTextUtils() {
    }

    /**
     * 按事件类型生成展示文案。
     *
     * @param type          契约 wire 值；未知或 null 时回退
     * @param actorNickname 动作人昵称
     * @param tripTitle     行程标题
     * @return 文案；未知类型返回 {@link #FALLBACK}
     */
    public static String text(String type, String actorNickname, String tripTitle) {
        if (type == null) {
            return FALLBACK;
        }
        return switch (type) {
            case "application_received" -> "「" + actorNickname + "」申请加入「" + tripTitle + "」";
            case "application_accepted" -> "「" + actorNickname + "」接受了你的申请（「" + tripTitle + "」）";
            case "application_rejected" -> "「" + actorNickname + "」拒绝了你的申请（「" + tripTitle + "」）";
            case "message" -> "「" + actorNickname + "」发来一条消息（「" + tripTitle + "」）";
            default -> FALLBACK;
        };
    }
}