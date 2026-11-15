package routeme.exception;

/**
 * 行程已结束，聊天只读，不能发送新消息。
 */
public class ChatReadOnly extends RuntimeException {

    public ChatReadOnly(long tripId) {
        super("chat is read only for completed trip " + tripId);
    }
}