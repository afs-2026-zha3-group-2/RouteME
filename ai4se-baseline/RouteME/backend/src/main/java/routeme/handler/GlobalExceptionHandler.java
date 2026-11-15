package routeme.handler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import routeme.exception.BusinessException;
import routeme.response.ErrorResponse;

/**
 * 全局异常处理器：唯一入口，把业务异常映射为契约错误码与状态码，
 * 框架级解析错误统一归为 INVALID_INPUT，其余归为 INTERNAL_ERROR。
 */
@RestControllerAdvice(basePackages = "routeme.controller")
public class GlobalExceptionHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException exception) {
        LOGGER.warn("business rule rejected request: {} {}", exception.code(), exception.getMessage());
        return ResponseEntity.status(exception.status())
                .body(new ErrorResponse(exception.code()));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ErrorResponse> handleUnreadableRequest(Exception exception) {
        LOGGER.warn("unreadable request: {}", exception.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("INVALID_INPUT"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception exception) {
        LOGGER.error("unexpected error while serving api request", exception);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("INTERNAL_ERROR"));
    }
}