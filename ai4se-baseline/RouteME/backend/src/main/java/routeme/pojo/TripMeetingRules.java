package routeme.pojo;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

import routeme.exception.InvalidInputException;

/**
 * 集合时间的解析与区间校验。
 *
 * <p>集合时间是本地墙上时间（无时区），契约格式固定为 {@code yyyy-MM-ddTHH:mm}；
 * 发布与编辑共用同一套规则，服务端为权威。</p>
 */
public final class TripMeetingRules {

    /** 契约与前端 datetime-local 一致的格式。 */
    public static final DateTimeFormatter FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");

    private TripMeetingRules() {
    }

    /**
     * 规范化集合时间：空白转 null，格式非法抛 {@link InvalidInputException}。
     *
     * @param meetingTime 原始输入，可为 null
     * @return 规范化后的值或 null
     */
    public static String normalize(String meetingTime) {
        if (meetingTime == null) {
            return null;
        }
        String trimmed = meetingTime.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        try {
            return LocalDateTime.parse(trimmed, FORMAT).format(FORMAT);
        } catch (DateTimeParseException exception) {
            throw new InvalidInputException("meeting time must be in yyyy-MM-ddTHH:mm");
        }
    }

    /**
     * 集合时间的日期部分不得晚于行程结束日期。
     *
     * @param endDate     行程结束日期
     * @param meetingTime 已规范化的集合时间，可为 null
     */
    public static void requireWithinEndDate(LocalDate endDate, String meetingTime) {
        if (meetingTime == null) {
            return;
        }
        if (LocalDateTime.parse(meetingTime, FORMAT).toLocalDate().isAfter(endDate)) {
            throw new InvalidInputException("meeting time must not be after end date");
        }
    }
}
