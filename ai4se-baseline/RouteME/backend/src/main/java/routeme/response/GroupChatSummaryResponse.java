package routeme.response;

import java.time.Instant;

import routeme.pojo.DemoUser;
import routeme.pojo.GroupMessage;
import routeme.pojo.TripPlan;

/**
 * 群聊会话列表条目：行程摘要 + 成员数 + 最后一条消息。
 *
 * @param left 当前用户是否已退出该行程（退出后仍可回看历史，但不能发送）
 */
public record GroupChatSummaryResponse(
        TripSummaryResponse trip,
        int memberCount,
        GroupMessageResponse lastMessage,
        int messageCount,
        boolean left) {

    public static GroupChatSummaryResponse from(
            TripPlan trip, DemoUser publisher, int memberCount,
            GroupMessage lastMessage, DemoUser lastSender, int messageCount, boolean left,
            Instant now) {
        return new GroupChatSummaryResponse(
                TripSummaryResponse.from(trip, publisher, now),
                memberCount,
                lastMessage == null ? null : GroupMessageResponse.from(lastMessage, lastSender),
                messageCount,
                left);
    }
}
