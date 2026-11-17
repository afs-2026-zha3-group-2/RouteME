package routeme.pojo;

import java.time.LocalDate;
import java.util.List;

/**
 * 发布行程的输入草稿；校验在 {@link TripPlan#create(TripPlanDraft, java.time.Instant)} 内完成。
 */
public record TripPlanDraft(
        long publisherId,
        String title,
        String destinationCode,
        LocalDate startDate,
        LocalDate endDate,
        List<String> stops,
        List<String> meetingAreas,
        String meetingTime,
        String note,
        Integer budgetMinCents,
        Integer budgetMaxCents,
        List<String> tags,
        Integer capacity,
        Long aiItineraryId) {
}