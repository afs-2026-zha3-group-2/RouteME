package routeme.service;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Stream;
import org.springframework.stereotype.Service;
import routeme.dto.TripQuery;
import routeme.model.TripPlan;

/**
 * 行程列表的筛选与排序。数据量小，过滤在内存完成；SQL 只负责取出未结束行程。
 */
@Service
public class TripPlanQueryService {

    public List<TripPlan> search(List<TripPlan> trips, TripQuery query, Function<Long, String> nicknameOf) {
        String keyword = query.keyword().toLowerCase(Locale.ROOT);
        Stream<TripPlan> matched = trips.stream()
                .filter(trip -> query.destination() == null || trip.destination().equals(query.destination()))
                .filter(trip -> query.dateFrom() == null || !trip.endDate().isBefore(query.dateFrom()))
                .filter(trip -> query.dateTo() == null || !trip.startDate().isAfter(query.dateTo()))
                .filter(trip -> query.tags().isEmpty() || trip.tags().stream().anyMatch(query.tags()::contains))
                .filter(trip -> keyword.isEmpty() || haystack(trip, nicknameOf).contains(keyword));
        return matched.sorted(comparator(query)).toList();
    }

    private Comparator<TripPlan> comparator(TripQuery query) {
        if (query.sort() == TripQuery.SortOrder.NEW) {
            return Comparator.comparing(TripPlan::createdAt).reversed();
        }
        return Comparator.comparing(TripPlan::startDate)
                .thenComparing(TripPlan::createdAt, Comparator.reverseOrder());
    }

    private String haystack(TripPlan trip, Function<Long, String> nicknameOf) {
        String nickname = Optional.ofNullable(nicknameOf.apply(trip.publisherId())).orElse("");
        return String.join(" ",
                        trip.title(),
                        trip.destination(),
                        String.join(" ", trip.stops()),
                        String.join(" ", trip.tags()),
                        nickname)
                .toLowerCase(Locale.ROOT);
    }
}