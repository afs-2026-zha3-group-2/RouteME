package routeme.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import routeme.dto.ErrorResponse;

@RestControllerAdvice(basePackages = "routeme.controller")
public class ApiErrorHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(ApiErrorHandler.class);

    @ExceptionHandler(GreetingNotFound.class)
    public ResponseEntity<ErrorResponse> handleGreetingNotFound(GreetingNotFound exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("GREETING_NOT_FOUND"));
    }

    @ExceptionHandler(InvalidInput.class)
    public ResponseEntity<ErrorResponse> handleInvalidInput(InvalidInput exception) {
        LOGGER.warn("invalid input: {}", exception.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("INVALID_INPUT"));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ErrorResponse> handleUnreadableRequest(Exception exception) {
        LOGGER.warn("unreadable request: {}", exception.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("INVALID_INPUT"));
    }

    @ExceptionHandler(DemoUserRequired.class)
    public ResponseEntity<ErrorResponse> handleDemoUserRequired(DemoUserRequired exception) {
        LOGGER.warn("demo user required: {}", exception.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponse("DEMO_USER_REQUIRED"));
    }

        @ExceptionHandler(TripNotFound.class)
            public ResponseEntity<ErrorResponse> handleTripNotFound(TripNotFound exception) {
                LOGGER.warn("trip not found: {}", exception.getMessage());
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ErrorResponse("TRIP_NOT_FOUND"));
            }

            @ExceptionHandler(ApplicationNotFound.class)
            public ResponseEntity<ErrorResponse> handleApplicationNotFound(ApplicationNotFound exception) {
                LOGGER.warn("application not found: {}", exception.getMessage());
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ErrorResponse("APPLICATION_NOT_FOUND"));
            }

            @ExceptionHandler(ForbiddenAction.class)
            public ResponseEntity<ErrorResponse> handleForbidden(ForbiddenAction exception) {
                LOGGER.warn("forbidden action: {}", exception.getMessage());
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new ErrorResponse("FORBIDDEN"));
            }

            @ExceptionHandler(TripNotOpen.class)
            public ResponseEntity<ErrorResponse> handleTripNotOpen(TripNotOpen exception) {
                LOGGER.warn("trip not open: {}", exception.getMessage());
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(new ErrorResponse("TRIP_NOT_OPEN"));
            }

            @ExceptionHandler(ApplicationNotPending.class)
            public ResponseEntity<ErrorResponse> handleApplicationNotPending(ApplicationNotPending exception) {
                LOGGER.warn("application not pending: {}", exception.getMessage());
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(new ErrorResponse("APPLICATION_NOT_PENDING"));
            }

            @ExceptionHandler(DuplicateApplication.class)
            public ResponseEntity<ErrorResponse> handleDuplicateApplication(DuplicateApplication exception) {
                LOGGER.warn("duplicate application: {}", exception.getMessage());
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(new ErrorResponse("DUPLICATE_APPLICATION"));
            }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception exception) {
        LOGGER.error("unexpected error while serving api request", exception);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("INTERNAL_ERROR"));
    }
}
