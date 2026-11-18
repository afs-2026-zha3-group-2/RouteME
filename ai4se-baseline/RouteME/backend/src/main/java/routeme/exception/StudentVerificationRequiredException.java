package routeme.exception;

import org.springframework.http.HttpStatus;

/**
 * 未完成学信网学籍认证：核心写操作返回 403 {@code STUDENT_VERIFICATION_REQUIRED}。
 */
public class StudentVerificationRequiredException extends BusinessException {

    public StudentVerificationRequiredException(long userId) {
        super(
                "STUDENT_VERIFICATION_REQUIRED",
                HttpStatus.FORBIDDEN,
                "student verification is required for user " + userId);
    }
}
