package routeme.response;

import java.util.List;
import java.util.function.Function;

import routeme.pojo.PageResult;

/**
 * 列表端点的分页响应：items / page / size / total / total_pages。
 */
public record PageResponse<T>(List<T> items, int page, int size, long total, int totalPages) {

    public static <T> PageResponse<T> from(PageResult<T> result) {
        return new PageResponse<>(
                result.items(), result.page(), result.size(), result.total(), result.totalPages());
    }

    public static <S, T> PageResponse<T> from(PageResult<S> result, Function<S, T> mapper) {
        return new PageResponse<>(
                result.items().stream().map(mapper).toList(),
                result.page(),
                result.size(),
                result.total(),
                result.totalPages());
    }
}