package routeme.exception;

/**
 * 非匹配双方（发布者与已接受同行者）不能进入该行程的聊天。
 */
public class ChatNotAllowed extends RuntimeException {

    public ChatNotAllowed(long tripId, long userId) {
        super("chat not allowed for trip " + tripId + " and user " + userId);
    }
}