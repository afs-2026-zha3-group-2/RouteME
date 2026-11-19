package routeme.utils;

import routeme.enums.BanReasonEnum;
import routeme.enums.TripCancelReasonEnum;

/**
 * 通知文案：标题与正文只由后端生成，前端直接展示，不再拼接。
 *
 * <p>正文只使用业务事实（行程标题、取消原因、分数变化、限制内容与恢复时间）；
 * 管理员自由文本备注与其他用户的隐私信息一律不进入通知。</p>
 */
public final class NotificationTextUtils {

    public static final String FALLBACK_TITLE = "平台通知";
    public static final String FALLBACK_CONTENT = "你有一条新通知";

    private NotificationTextUtils() {
    }

    /** 一条通知的标题与正文。 */
    public record Draft(String title, String content) {
    }

    // ---------- 同行申请 ----------

    public static Draft applicationReceived(String actorNickname, String tripTitle) {
        return new Draft(
                "新的同行申请",
                "「" + actorNickname + "」申请加入「" + tripTitle + "」，请及时处理。");
    }

    public static Draft applicationAccepted(String actorNickname, String tripTitle) {
        return new Draft(
                "申请已通过",
                "「" + actorNickname + "」接受了你的申请（「" + tripTitle + "」）。");
    }

    public static Draft applicationRejected(String actorNickname, String tripTitle) {
        return new Draft(
                "申请未通过",
                "「" + actorNickname + "」拒绝了你的申请（「" + tripTitle + "」）。");
    }

    public static Draft applicationClosed(String tripTitle, String cancelReasonLabel) {
        return new Draft(
                "申请已关闭",
                "行程「" + tripTitle + "」已取消，你的同行申请已关闭。取消原因：" + cancelReasonLabel + "。");
    }

    // ---------- 行程 ----------

    public static Draft tripFull(String tripTitle) {
        return new Draft("行程已满员", "「" + tripTitle + "」已满员，同行名单已确定。");
    }

    public static Draft tripRouteUpdated(String tripTitle) {
        return new Draft(
                "路线已更新", "「" + tripTitle + "」的途经点有调整，请查看最新安排。");
    }

    public static Draft tripGroupOpened(String tripTitle) {
        return new Draft(
                "行程群聊已开通", "「" + tripTitle + "」已满员成行，群聊已开通，可在群内共同协商路线。");
    }

    public static Draft tripOngoing(String tripTitle) {
        return new Draft("行程已开始", "「" + tripTitle + "」已进入旅行中，祝你旅途愉快。");
    }

    public static Draft tripCancelled(String tripTitle, String cancelReasonLabel) {
        return new Draft(
                "行程已取消", "「" + tripTitle + "」已被发起人取消。取消原因：" + cancelReasonLabel + "。");
    }

    public static Draft tripCompleted(String tripTitle) {
        return new Draft("行程已结束", "「" + tripTitle + "」已结束，欢迎在旅行体验中分享你的感受。");
    }

    // ---------- 聊天 ----------

    public static Draft chatMessage(String actorNickname, String tripTitle) {
        return new Draft("新的同行消息", "「" + actorNickname + "」发来一条消息（「" + tripTitle + "」）。");
    }

    public static Draft groupMessage(String actorNickname, String tripTitle) {
        return new Draft("新的群聊消息", "「" + actorNickname + "」在「" + tripTitle + "」群聊发来一条消息。");
    }

    // ---------- 信用 ----------

    public static Draft creditChanged(int delta, int scoreAfter, String reasonLabel, boolean low) {
        String change = delta < 0
                ? "信用分扣除 " + Math.abs(delta) + " 分"
                : "信用分增加 " + delta + " 分";
        String tail = low
                ? "；当前信用分 " + scoreAfter + "，已触发信用限制，请完成安全学习恢复。"
                : "；当前信用分 " + scoreAfter + "。";
        return new Draft(
                delta < 0 ? "信用分 -" + Math.abs(delta) : "信用分 +" + delta,
                reasonLabel + "，" + change + tail);
    }

    public static Draft creditRecovered(int scoreAfter, String reasonLabel) {
        return new Draft(
                "信用分已恢复",
                reasonLabel + "，信用分恢复至 " + scoreAfter + "，信用限制已解除。");
    }

    // ---------- 举报 ----------

    public static Draft reportSubmitted(long reportId) {
        return new Draft(
                "举报已提交",
                "你提交的举报已收到（编号 R-" + reportId + "），平台将尽快核实。");
    }

    public static Draft reportProcessing(long reportId) {
        return new Draft(
                "举报处理中",
                "你提交的举报（编号 R-" + reportId + "）已进入处理中，请耐心等待。");
    }

    public static Draft reportResolved(long reportId, boolean rejected) {
        if (rejected) {
            return new Draft(
                    "举报已处理",
                    "经核实，你提交的举报（编号 R-" + reportId + "）未发现违规，已关闭。");
        }
        return new Draft(
                "举报已处理",
                "你提交的举报（编号 R-" + reportId + "）已完成处理，平台已按社区规则采取措施。");
    }

    // ---------- 账号 ----------

    public static Draft accountSuspended() {
        return new Draft(
                "账号已被暂停",
                "你的账号已被暂停，暂停期间不能发布行程、申请同行或发起客服会话。"
                        + "恢复时间：以平台复核结果为准。");
    }

    public static Draft accountBanned(String banReasonLabel, String expiresAt) {
        String recovery = expiresAt == null || expiresAt.isBlank()
                ? "恢复时间：永久封禁。"
                : "恢复时间：" + expiresAt + "。";
        return new Draft(
                "账号已被封禁",
                "你的账号因" + banReasonLabel + "被封禁，封禁期间不能发布行程、申请同行、发送消息"
                        + "或发起客服会话。" + recovery);
    }

    public static Draft accountRestored() {
        return new Draft("账号已恢复", "你的账号限制已解除，可以正常使用平台功能。");
    }

    // ---------- 客服 ----------

    public static Draft serviceJoined() {
        return new Draft("客服已接入", "人工客服已接入你的会话，可以开始沟通。");
    }

    public static Draft serviceReply() {
        return new Draft("客服新回复", "人工客服回复了你的会话，点击查看。");
    }

    public static Draft serviceClosed() {
        return new Draft("客服会话已结束", "本次人工客服会话已结束，如有需要可重新发起。");
    }

    // ---------- 系统 ----------

    public static Draft safetyReminder(String tripTitle) {
        return new Draft(
                "出行安全提醒",
                "「" + tripTitle + "」已开始，请与同行者保持联系，注意人身与财产安全；"
                        + "遇到问题可随时举报。");
    }

    public static Draft identityVerified() {
        return new Draft(
                "身份认证通过", "你的基础身份资料已通过认证，可以正常发布行程与申请同行。");
    }

    // ---------- 文案标签 ----------

    /** 信用变动原因：未知原因码原样展示，便于排查新增事件。 */
    public static String creditReasonLabel(String reasonCode) {
        if (reasonCode == null) {
            return "信用分发生变动";
        }
        return switch (reasonCode) {
            case "EXIT_BEFORE_TRIP" -> "由于你在出发前 48 小时内退出同行";
            case "EXIT_DURING_TRIP" -> "由于你在行程中退出同行";
            case "EXIT_SAFETY_PENDING" -> "由于你以安全事由退出同行（待核实）";
            case "EXIT_FORCE_MAJEURE_PENDING" -> "由于你以不可抗力事由退出同行（待核实）";
            case "EXIT_BEFORE_TRIP_NO_PENALTY" -> "出发前退出同行";
            case "EXIT_REVIEW_PENALTY" -> "退出同行核实后确认扣分";
            case "EXPERIENCE_LIKE" -> "你的旅行体验获得同行者点赞";
            case "SAFETY_LEARNING_RECOVERY" -> "完成安全学习";
            default -> reasonCode;
        };
    }

    /** 行程取消原因标签；未知值原样展示。 */
    public static String cancelReasonLabel(String wireValue) {
        if (wireValue == null) {
            return "未说明";
        }
        for (TripCancelReasonEnum reason : TripCancelReasonEnum.values()) {
            if (reason.wireValue().equals(wireValue)) {
                return reason.label();
            }
        }
        return wireValue;
    }

    /** 封禁原因标签：只展示结构化原因，不含管理员备注。 */
    public static String banReasonLabel(String code) {
        if (code == null) {
            return "违反社区规则";
        }
        for (BanReasonEnum reason : BanReasonEnum.values()) {
            if (reason.code().equals(code)) {
                return switch (reason) {
                    case HARASSMENT -> "骚扰他人";
                    case FAKE_TRIP -> "发布虚假行程";
                    case FRAUD_RISK -> "存在欺诈风险";
                    case ILLEGAL_CONTENT -> "发布违法违规内容";
                    case IMPERSONATION -> "冒用他人身份";
                    case NO_SHOW_DISRUPTION -> "无故缺席影响行程";
                    case PRIVACY_LEAK -> "泄露他人隐私";
                    case OTHER -> "违反社区规则";
                };
            }
        }
        return code;
    }
}