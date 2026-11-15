package routeme.exception;

/**
 * 当前身份无权执行该操作。
 */
public class ForbiddenAction extends RuntimeException {

    public ForbiddenAction(String message) {
        super(message);
    }
}