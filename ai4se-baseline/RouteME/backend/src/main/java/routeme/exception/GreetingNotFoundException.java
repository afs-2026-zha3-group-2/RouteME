package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * greetings 表没有记录。
 */
public class GreetingNotFoundException extends BusinessException {

    public GreetingNotFoundException() {
        super("GREETING_NOT_FOUND", HttpStatus.NOT_FOUND, "greetings table has no record");
    }
}