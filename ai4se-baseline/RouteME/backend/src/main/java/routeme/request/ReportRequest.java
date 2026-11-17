package routeme.request;

/**
 * Report submission body.
 *
 * <p>{@code tripId} is only set when the reporter submits from a trip chat; it pins the
 * conversation shown to the administrator. Other entry points leave it {@code null}.</p>
 */
public record ReportRequest(String targetType, Long targetId, String reason, String note, Long tripId) {
}