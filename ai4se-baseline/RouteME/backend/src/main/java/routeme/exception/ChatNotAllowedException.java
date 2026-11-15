package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * 当前用户不是该行程的同行者，不能聊天。
 */
public class ChatNotAllowedException extends BusinessException {

    public ChatNotAllowedException(long tripId, long userId) {
        super("CHAT_NOT_ALLOWED", HttpStatus.FORBIDDEN,
                "chat not allowed for trip " + tripId + " and user " + userId);
    }
}