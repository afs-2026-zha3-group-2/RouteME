package routeme.request;

import java.time.LocalDate;
import java.util.List;

/**
 * 发布行程请求。字段与契约 TripCreateRequest 一一对应。
 *
 * <p>目的地只接受 6 位行政区划二级代码，名称由后端按字典生成。</p>
 *
 * <p>{@code departureCode} 选填：出发城市（同为 6 位二级代码），为空则不记录出发地。</p>
 *
 * <p>{@code aiItineraryId} 可空；非空时后端校验快照存在且归属当前用户。</p>
 * <p>{@code travelMode} 选填：driving / bicycling / transit，未填为 null。</p>
 */
public record TripCreateRequest(
        String title,
        String departureCode,
        String destinationCode,
        LocalDate startDate,
        LocalDate endDate,
        List<String> stops,
        List<String> meetingAreas,
        String meetingTime,
        String travelMode,
        String note,
        Integer budgetMinCents,
        Integer budgetMaxCents,
        List<String> tags,
        Integer capacity,
        Long aiItineraryId) {
}