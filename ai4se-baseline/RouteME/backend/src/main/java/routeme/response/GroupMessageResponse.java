package routeme.response;

import java.time.Instant;

import routeme.pojo.DemoUser;
import routeme.pojo.GroupMessage;

/**
 * 群聊消息出参：附发送者资料，供群气泡展示昵称与头像。
 */
public record GroupMessageResponse(
        long id,
        long tripId,
        DemoUserResponse sender,
        String content,
        Instant sentAt) {

    public static GroupMessageResponse from(GroupMessage message, DemoUser sender) {
        return new GroupMessageResponse(
                message.id(),
                message.tripId(),
                DemoUserResponse.from(sender),
                message.content(),
                message.sentAt());
    }
}