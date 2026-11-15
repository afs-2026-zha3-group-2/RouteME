package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * 行程已结束，聊天只读，不能发送新消息。
 */
public class ChatReadOnlyException extends BusinessException {

    public ChatReadOnlyException(long tripId) {
        super("CHAT_READ_ONLY", HttpStatus.CONFLICT, "chat is read only for completed trip " + tripId);
    }
}