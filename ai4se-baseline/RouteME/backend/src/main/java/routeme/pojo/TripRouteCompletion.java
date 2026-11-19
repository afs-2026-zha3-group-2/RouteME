package routeme.pojo;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.TreeSet;

import routeme.exception.InvalidInputException;

/**
 * 一次行程的路线完成度声明：{@code completedStopIndexes} 为实际完成的途经点下标（升序、去重），
 * {@code plannedStopCount} 为结束时的途经点总数快照。单行程完成度 = 完成点数 / 计划点数。
 *
 * <p>声明只在发布者显式结束行程时落库，结束后不可修改；到期自动完成不产生声明。</p>
 */
public record TripRouteCompletion(
        long id,
        long tripId,
        long userId,
        List<Integer> completedStopIndexes,
        int plannedStopCount,
        Instant createdAt) {

    /**
     * 归一化完成点下标：{@code null} 视为全部完成；否则校验取值范围与去重，升序返回。
     * 非法下标（负数、越界、重复、空值）一律 {@link InvalidInputException}。
     */
    public static List<Integer> cleanIndexes(List<Integer> values, int plannedStopCount) {
        if (plannedStopCount < 1) {
            throw new InvalidInputException("planned stop count must be positive");
        }
        if (values == null) {
            List<Integer> all = new ArrayList<>();
            for (int index = 0; index < plannedStopCount; index++) {
                all.add(index);
            }
            return all;
        }
        TreeSet<Integer> sorted = new TreeSet<>();
        for (Integer value : values) {
            if (value == null || value < 0 || value >= plannedStopCount) {
                throw new InvalidInputException("completed stop index out of range: " + value);
            }
            if (!sorted.add(value)) {
                throw new InvalidInputException("duplicate completed stop index: " + value);
            }
        }
        return new ArrayList<>(sorted);
    }
}