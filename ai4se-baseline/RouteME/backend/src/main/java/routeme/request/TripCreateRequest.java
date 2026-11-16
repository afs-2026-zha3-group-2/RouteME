package routeme.request;

import java.time.LocalDate;
import java.util.List;

/**
 * 发布行程请求。字段与契约 TripCreateRequest 一一对应。
 *
 * <p>目的地只接受 6 位行政区划二级代码，名称由后端按字典生成。</p>
 */
public record TripCreateRequest(
        String title,
        String destinationCode,
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