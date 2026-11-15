package routeme.pojo;

import java.util.List;

/**
 * 一页数据：条目、当前页、每页容量与命中总数。领域与仓储层只依赖它，不依赖分页框架类型。
 */
public record PageResult<T>(List<T> items, int page, int size, long total) {

    public static <T> PageResult<T> empty(int page, int size) {
        return new PageResult<>(List.of(), page, size, 0L);
    }

    public int totalPages() {
        if (size <= 0) {
            return 1;
        }
        return (int) Math.ceil((double) total / size);
    }
}