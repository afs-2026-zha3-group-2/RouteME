package routeme.exception;

/**
 * 输入不满足业务约束；对外只暴露 INVALID_INPUT，字段细节进日志。
 */
public class InvalidInput extends RuntimeException {

    public InvalidInput(String message) {
        super(message);
    }
}