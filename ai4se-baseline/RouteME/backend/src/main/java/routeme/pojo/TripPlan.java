package routeme.pojo;

import static routeme.constant.TripCatalogConstant.MAX_CAPACITY;
import static routeme.constant.TripCatalogConstant.MAX_MEETING_AREA_LENGTH;
import static routeme.constant.TripCatalogConstant.MAX_NOTE_LENGTH;
import static routeme.constant.TripCatalogConstant.MAX_TAGS;
import static routeme.constant.TripCatalogConstant.MAX_TITLE_LENGTH;
import static routeme.constant.TripCatalogConstant.MIN_CAPACITY;
import static routeme.constant.TripCatalogConstant.MIN_STOPS;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

import routeme.area.AreaNames;
import routeme.enums.TripStatusEnum;
import routeme.exception.InvalidInputException;

/**
 * 旅行计划（领域对象）。状态不存储，由 completedAt 与人数推导。
 */
public record TripPlan(
        long id,
        long publisherId,
        String title,
        String destinationCode,
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

    public TripStatusEnum status() {
        if (completedAt != null) {
            return TripStatusEnum.COMPLETED;
        }
        if (joinedCount >= capacity) {
            return TripStatusEnum.FULL;
        }
        return TripStatusEnum.RECRUITING;
    }

    public TripPlan withId(long newId) {
        return new TripPlan(newId, publisherId, title, destinationCode, destination, startDate, endDate, stops, meetingArea, note,
                budgetMinCents, budgetMaxCents, tags, capacity, joinedCount, completedAt, createdAt, updatedAt);
    }

    public static TripPlan create(TripPlanDraft draft, Instant now) {
        String title = requireText(draft.title(), "title");
        if (title.length() > MAX_TITLE_LENGTH) {
            throw new InvalidInputException("title must be at most " + MAX_TITLE_LENGTH + " characters");
        }
        if (draft.destinationCode() == null || draft.destinationCode().isBlank()) {
            throw new InvalidInputException("destination_code is required");
        }
        String destinationCode = draft.destinationCode().trim();
        if (!AreaNames.isValidCityCode(destinationCode)) {
            throw new InvalidInputException("destination_code is not a supported city");
        }
        String destination = AreaNames.cityDisplayNameOf(destinationCode);
        if (draft.startDate() == null) {
            throw new InvalidInputException("start date is required");
        }
        if (draft.endDate() == null) {
            throw new InvalidInputException("end date is required");
        }
        if (draft.endDate().isBefore(draft.startDate())) {
            throw new InvalidInputException("end date must not be before start date");
        }
        List<String> stops = cleanList(draft.stops());
        if (stops.size() < MIN_STOPS) {
            throw new InvalidInputException("at least " + MIN_STOPS + " stops are required");
        }
        int capacity = draft.capacity() == null ? 0 : draft.capacity();
        if (capacity < MIN_CAPACITY || capacity > MAX_CAPACITY) {
            throw new InvalidInputException("capacity must be between " + MIN_CAPACITY + " and " + MAX_CAPACITY);
        }
        Integer budgetMin = requireNonNegative(draft.budgetMinCents(), "budget min");
        Integer budgetMax = requireNonNegative(draft.budgetMaxCents(), "budget max");
        if (budgetMin != null && budgetMax != null && budgetMin > budgetMax) {
            throw new InvalidInputException("budget min must not exceed budget max");
        }
        List<String> tags = cleanList(draft.tags());
        if (tags.size() > MAX_TAGS) {
            throw new InvalidInputException("at most " + MAX_TAGS + " tags are allowed");
        }
        String meetingArea = trimToNull(draft.meetingArea());
        if (meetingArea != null && meetingArea.length() > MAX_MEETING_AREA_LENGTH) {
            throw new InvalidInputException("meeting area is too long");
        }
        String note = trimToNull(draft.note());
        if (note != null && note.length() > MAX_NOTE_LENGTH) {
            throw new InvalidInputException("note is too long");
        }
        return new TripPlan(0, draft.publisherId(), title, destinationCode, destination, draft.startDate(), draft.endDate(),
                stops, meetingArea, note, budgetMin, budgetMax, tags, capacity, 1, null, now, now);
    }

    private static String requireText(String value, String field) {
        String trimmed = trimToNull(value);
        if (trimmed == null) {
            throw new InvalidInputException(field + " is required");
        }
        return trimmed;
    }

    private static Integer requireNonNegative(Integer value, String field) {
        if (value != null && value < 0) {
            throw new InvalidInputException(field + " must not be negative");
        }
        return value;
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static List<String> cleanList(List<String> values) {
        if (values == null) {
            return List.of();
        }
        LinkedHashSet<String> cleaned = new LinkedHashSet<>();
        for (String value : values) {
            String trimmed = trimToNull(value);
            if (trimmed != null) {
                cleaned.add(trimmed);
            }
        }
        return new ArrayList<>(cleaned);
    }
}