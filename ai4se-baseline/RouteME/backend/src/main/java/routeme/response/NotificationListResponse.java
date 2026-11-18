package routeme.response;

import java.util.List;

/**
 * 最新通知与计数在同一响应中返回，避免前端看到两个时刻的快照。
 */
public record NotificationListResponse(
        List<NotificationResponse> items, NotificationCountsResponse counts) {
}