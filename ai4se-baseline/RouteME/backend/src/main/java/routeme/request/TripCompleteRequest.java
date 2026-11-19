package routeme.request;

import java.util.List;

/**
 * 结束行程请求（可选 body）。字段与契约 TripCompleteRequest 一一对应。
 *
 * <p>completed_stop_indexes 为实际完成的途经点下标；缺省（null）视为全部完成。</p>
 */
public record TripCompleteRequest(List<Integer> completedStopIndexes) {
}