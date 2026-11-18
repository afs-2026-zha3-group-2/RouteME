package routeme.param;

import java.util.List;

import routeme.exception.InvalidInputException;

/**
 * 分页参数解析：page 从 1 起、size 默认 20、上限 50；非法值按契约返回 400 INVALID_INPUT。
 */
public record PageParam(int page, int size) {

    public static final int DEFAULT_PAGE = 1;
    public static final int DEFAULT_SIZE = 20;
    public static final int MAX_SIZE = 50;

    public static PageParam parse(Integer page, Integer size) {
        int resolvedPage = page == null ? DEFAULT_PAGE : page;
        int resolvedSize = size == null ? DEFAULT_SIZE : size;
        if (resolvedPage < 1) {
            throw new InvalidInputException("page must be >= 1");
        }
        if (resolvedSize < 1 || resolvedSize > MAX_SIZE) {
            throw new InvalidInputException("size must be between 1 and " + MAX_SIZE);
        }
        return new PageParam(resolvedPage, resolvedSize);
    }

    /**
     * 对已有序的完整列表切出一页。
     */
    public <T> List<T> slice(List<T> all) {
        int from = (page - 1) * size;
        if (from >= all.size()) {
            return List.of();
        }
        int to = Math.min(from + size, all.size());
        return all.subList(from, to);
    }
}