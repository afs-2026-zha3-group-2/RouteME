package routeme.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * 发布行程请求。字段与契约 TripCreateRequest 一一对应。
 */
public record TripCreateRequest(
        String title,
        String destination,
        LocalDate startDate,
        LocalDate endDate,
        List<String> stops,
        String meetingArea,
        String note,
        Integer budgetMinCents,
        Integer budgetMaxCents,
        List<String> tags,
        Integer capacity) {
}