package routeme.exception;

import org.springframework.http.HttpStatus;

/** 退出记录或证明材料不存在（含系统清退等无退出事件的情况）。 */
public class LeaveRecordNotFoundException extends BusinessException {

    public LeaveRecordNotFoundException(long id) {
        super("LEAVE_RECORD_NOT_FOUND", HttpStatus.NOT_FOUND, "leave record not found: " + id);
    }
}
