package routeme.exception;

/**
 * 缺少或未知的演示身份。
 */
public class DemoUserRequired extends RuntimeException {

    public DemoUserRequired(String message) {
        super(message);
    }
}