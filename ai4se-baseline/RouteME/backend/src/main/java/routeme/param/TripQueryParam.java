package routeme.param;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Set;

import routeme.request.TripQuery;
import routeme.exception.InvalidInputException;

/**
 * 行程列表与匹配列表共用的查询参数解析。
 */
public final class TripQueryParam {

    private TripQueryParam() {
    }

    public static Set<String> parseTags(String raw) {
        if (raw == null || raw.isBlank()) {
            return Set.of();
        }
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(tag -> !tag.isEmpty())
                .collect(LinkedHashSet::new, LinkedHashSet::add, LinkedHashSet::addAll);
    }

    public static TripQuery.SortOrder parseSort(String raw) {
        if (raw == null || raw.isBlank() || "date".equals(raw)) {
            return TripQuery.SortOrder.DATE;
        }
        if ("new".equals(raw)) {
            return TripQuery.SortOrder.NEW;
        }
        throw new InvalidInputException("unsupported sort: " + raw);
    }

    public static TripQuery.SortOrder parseSortWithMatch(String raw) {
        if (raw == null || raw.isBlank() || "match".equals(raw)) {
            return TripQuery.SortOrder.MATCH;
        }
        if ("date".equals(raw) || "new".equals(raw)) {
            return parseSort(raw);
        }
        throw new InvalidInputException("unsupported sort: " + raw);
    }
}