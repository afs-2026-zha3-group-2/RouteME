package routeme.request;

/**
 * 取消行程请求。字段与契约 TripCancelRequest 一一对应。
 *
 * <p>reason 必填，取值为 8 项固定原因；note 仅「其他原因」必填，1–100 字。</p>
 */
public record TripCancelRequest(String reason, String note) {
}
