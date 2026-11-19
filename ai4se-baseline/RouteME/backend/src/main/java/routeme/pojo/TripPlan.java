package routeme.pojo;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

import routeme.area.AreaNames;
import static routeme.constant.TripCatalogConstant.MAX_CAPACITY;
import static routeme.constant.TripCatalogConstant.MAX_MEETING_AREAS;
import static routeme.constant.TripCatalogConstant.MAX_MEETING_AREA_LENGTH;
import static routeme.constant.TripCatalogConstant.MAX_NOTE_LENGTH;
import static routeme.constant.TripCatalogConstant.MAX_TAGS;
import static routeme.constant.TripCatalogConstant.MAX_TITLE_LENGTH;
import static routeme.constant.TripCatalogConstant.MIN_CAPACITY;
import static routeme.constant.TripCatalogConstant.MIN_STOPS;
import static routeme.constant.TripCatalogConstant.TRAVEL_MODES;
import routeme.constant.TripTimeZoneConstant;
import routeme.enums.TripStatusEnum;
import routeme.exception.InvalidInputException;

/**
 * 旅行计划（领域对象）。状态不存储，由 completedAt 与人数推导。
 * {@code aiItineraryId} 可空：来自 AI 推荐快照的行程携带链接，普通发布为 null。
 * {@code travelMode} 可空：仅 0.15.0 起发布时可选（driving / bicycling / transit），旧行程为 null。
 *
 * @param departureCode 出发城市代码（可空，如 440100）
 * @param departure 出发城市展示名（由字典生成，可为 null）
 */
public record TripPlan(
        long id,
        long publisherId,
        String title,
        String departureCode,
        String departure,
        String destinationCode,
        String destination,
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
        int capacity,
        int joinedCount,
        Instant completedAt,
        Instant createdAt,
        Instant updatedAt,
        Instant cancelledAt,
        String cancelReason,
        String cancelNote,
        Long aiItineraryId) {

    public Instant plannedStart() {
        return startDate.atStartOfDay(TripTimeZoneConstant.ZONE).toInstant();
    }

    public Instant plannedEnd() {
        return endDate.plusDays(1).atStartOfDay(TripTimeZoneConstant.ZONE).toInstant();
    }

    /**
     * 五态推导：已取消 > 已结束 > 旅行中 > 已满员 > 招募中。
     * 到达结束日期次日 00:00（Asia/Shanghai）即视为已结束，无需人工操作。
     */
    public TripStatusEnum status(Instant now) {
        if (cancelledAt != null) {
            return TripStatusEnum.CANCELLED;
        }
        if (completedAt != null || !now.isBefore(plannedEnd())) {
            return TripStatusEnum.COMPLETED;
        }
        if (!now.isBefore(plannedStart())) {
            return TripStatusEnum.ONGOING;
        }
        if (joinedCount >= capacity) {
            return TripStatusEnum.FULL;
        }
        return TripStatusEnum.RECRUITING;
    }

    public TripStatusEnum status() {
        return status(Instant.now());
    }

    /**
     * 是否处于「距离结束不足 3 小时」的提醒窗口：结束日期 21:00 起至次日 00:00。
     */
    public boolean endingSoon(Instant now) {
        return status(now) == TripStatusEnum.ONGOING
                && !now.isBefore(plannedEnd().minus(3, ChronoUnit.HOURS));
    }

    public TripPlan withId(long newId) {
        return new TripPlan(newId, publisherId, title, departureCode, departure, destinationCode, destination, startDate, endDate, stops, meetingAreas,
                meetingTime, travelMode, note, budgetMinCents, budgetMaxCents, tags, capacity, joinedCount, completedAt, createdAt, updatedAt,
                cancelledAt, cancelReason, cancelNote, aiItineraryId);
    }

    /**
     * 只替换集合区域与集合时间，并刷新更新时间。
     */
    public TripPlan withMeetingInfo(List<String> newMeetingAreas, String newMeetingTime, Instant now) {
        return new TripPlan(id, publisherId, title, departureCode, departure, destinationCode, destination, startDate, endDate, stops,
                newMeetingAreas, newMeetingTime, travelMode, note, budgetMinCents, budgetMaxCents, tags, capacity, joinedCount,
                completedAt, createdAt, now, cancelledAt, cancelReason, cancelNote, aiItineraryId);
    }

    /**
     * 只替换途经点，并刷新更新时间；校验与发布同口径。
     */
    public TripPlan withStops(List<String> newStops, Instant now) {
        return new TripPlan(id, publisherId, title, departureCode, departure, destinationCode, destination, startDate, endDate, cleanStops(newStops),
                meetingAreas, meetingTime, travelMode, note, budgetMinCents, budgetMaxCents, tags, capacity, joinedCount,
                completedAt, createdAt, now, cancelledAt, cancelReason, cancelNote, aiItineraryId);
    }

    /** 途经点清洗：trim 去重保序，至少 {@value routeme.constant.TripCatalogConstant#MIN_STOPS} 个。 */
    public static List<String> cleanStops(List<String> values) {
        List<String> stops = cleanList(values);
        if (stops.size() < MIN_STOPS) {
            throw new InvalidInputException("at least " + MIN_STOPS + " stops are required");
        }
        return stops;
    }

    public static TripPlan create(TripPlanDraft draft, Instant now) {
        return create(draft, now, LocalDate.ofInstant(now, TripTimeZoneConstant.ZONE));
    }

    public static TripPlan create(TripPlanDraft draft, Instant now, LocalDate today) {
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
        String departureCode = trimToNull(draft.departureCode());
        String departure = null;
        if (departureCode != null) {
            if (!AreaNames.isValidCityCode(departureCode)) {
                throw new InvalidInputException("departure_code is not a supported city");
            }
            departure = AreaNames.cityDisplayNameOf(departureCode);
        }
        if (draft.startDate() == null) {
            throw new InvalidInputException("start date is required");
        }
        if (draft.startDate().isBefore(today)) {
            throw new InvalidInputException("start date must not be before today");
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
        List<String> meetingAreas = cleanMeetingAreas(draft.meetingAreas());
        String meetingTime = TripMeetingRules.normalize(draft.meetingTime());
        TripMeetingRules.requireWithinEndDate(draft.endDate(), meetingTime);
        String travelMode = normalizeTravelMode(draft.travelMode());
        String note = trimToNull(draft.note());
        if (note != null && note.length() > MAX_NOTE_LENGTH) {
            throw new InvalidInputException("note is too long");
        }
        return new TripPlan(0, draft.publisherId(), title, departureCode, departure, destinationCode, destination, draft.startDate(), draft.endDate(),
                stops, meetingAreas, meetingTime, travelMode, note, budgetMin, budgetMax, tags, capacity, 1, null, now, now,
                null, null, null, draft.aiItineraryId());
    }

    /** 出行方式：null / 空白视为未填写；其他取值必须是 driving / bicycling / transit。 */
    private static String normalizeTravelMode(String value) {
        String trimmed = trimToNull(value);
        if (trimmed == null) {
            return null;
        }
        if (!TRAVEL_MODES.contains(trimmed)) {
            throw new InvalidInputException("travel_mode must be one of " + TRAVEL_MODES);
        }
        return trimmed;
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
        // strip 覆盖全角空格 U+3000，与前端 JS trim 同口径（spec F-3）。
        String trimmed = value.strip();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /** 集合地点：trim 去重保序，只允许 1 个、长度 ≤100 字（历史行程可能已存多个）。 */
    public static List<String> cleanMeetingAreas(List<String> values) {
        List<String> cleaned = cleanList(values);
        if (cleaned.size() > MAX_MEETING_AREAS) {
            throw new InvalidInputException("at most " + MAX_MEETING_AREAS + " meeting area is allowed");
        }
        for (String area : cleaned) {
            if (area.length() > MAX_MEETING_AREA_LENGTH) {
                throw new InvalidInputException("meeting area is too long");
            }
        }
        return cleaned;
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