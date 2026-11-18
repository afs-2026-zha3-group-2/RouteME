package routeme.response;

import java.util.Map;

/**
 * 未读计数：总数 + 按通知类型拆分（八类始终齐备，零值不省略）。
 */
public record NotificationCountsResponse(long total, Map<String, Long> byType) {
}