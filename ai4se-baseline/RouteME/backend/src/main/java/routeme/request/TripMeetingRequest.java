package routeme.request;

import java.util.List;

/**
 * 维护集合信息请求。字段与契约 TripMeetingRequest 一一对应。
 *
 * <p>两个字段整体替换：未传或传 null 视为清空。</p>
 */
public record TripMeetingRequest(List<String> meetingAreas, String meetingTime) {
}
