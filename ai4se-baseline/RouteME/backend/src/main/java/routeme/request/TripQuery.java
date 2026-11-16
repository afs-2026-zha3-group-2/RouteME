package routeme.request;

import java.time.LocalDate;
import java.util.Set;

/**
 * 行程列表查询条件。排序只支持出发日期与最新发布；按匹配度排序属 REQ-003。
 */
public record TripQuery(
        String destinationCode,
        LocalDate dateFrom,
        LocalDate dateTo,
        Set<String> tags,
        SortOrder sort) {

    public enum SortOrder {
            MATCH,
            DATE,
            NEW
        }

    public TripQuery {
        destinationCode = destinationCode == null ? null : destinationCode.trim();
        if (destinationCode != null && destinationCode.isEmpty()) {
            destinationCode = null;
        }
        tags = tags == null ? Set.of() : Set.copyOf(tags);
        sort = sort == null ? SortOrder.DATE : sort;
    }

    public static TripQuery empty() {
        return new TripQuery(null, null, null, Set.of(), SortOrder.DATE);
    }
}