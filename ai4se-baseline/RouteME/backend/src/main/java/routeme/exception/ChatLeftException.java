package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * 用户已退出该行程：一对一聊天与群聊都只保留历史回看，不能再发送新消息。
 */
public class ChatLeftException extends BusinessException {

    public ChatLeftException(long tripId, long userId) {
        super("CHAT_LEFT", HttpStatus.FORBIDDEN,
                "user " + userId + " already left trip " + tripId + "; sending is not allowed");
    }
}
