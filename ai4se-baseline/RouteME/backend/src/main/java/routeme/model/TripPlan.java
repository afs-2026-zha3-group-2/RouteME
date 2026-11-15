package routeme.model;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * 旅行计划（领域对象）。状态不存储，由 completedAt 与人数推导。
 */
public record TripPlan(
        long id,
        long publisherId,
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
        int capacity,
        int joinedCount,
        Instant completedAt,
        Instant createdAt,
        Instant updatedAt) {

    public TripStatus status() {
        if (completedAt != null) {
            return TripStatus.COMPLETED;
        }
        if (joinedCount >= capacity) {
            return TripStatus.FULL;
        }
        return TripStatus.RECRUITING;
    }
}