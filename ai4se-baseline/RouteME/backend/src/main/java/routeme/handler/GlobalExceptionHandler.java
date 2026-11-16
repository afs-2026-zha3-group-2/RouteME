package routeme.handler;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

import lombok.extern.slf4j.Slf4j;
import routeme.exception.BusinessException;
import routeme.response.ErrorResponse;

/**
 * 全局异常处理器：唯一入口，把业务异常映射为契约错误码与状态码，
 * 框架级解析错误与上传超限统一归为 INVALID_INPUT，其余归为 INTERNAL_ERROR。
 */
@Slf4j
@RestControllerAdvice(basePackages = "routeme.controller")
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException exception) {
        log.warn("business rule rejected request: {} {}", exception.code(), exception.getMessage());
        return ResponseEntity.status(exception.status())
                .body(new ErrorResponse(
                        exception.code(), exception.fields().isEmpty() ? null : exception.fields()));
    }

    @ExceptionHandler({
            HttpMessageNotReadableException.class,
            MethodArgumentTypeMismatchException.class,
            MissingServletRequestParameterException.class,
            MissingServletRequestPartException.class,
            MaxUploadSizeExceededException.class})
    public ResponseEntity<ErrorResponse> handleUnreadableRequest(Exception exception) {
        log.warn("unreadable request: {}", exception.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("INVALID_INPUT"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception exception) {
        log.error("unexpected error while serving api request", exception);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("INTERNAL_ERROR"));
    }
}