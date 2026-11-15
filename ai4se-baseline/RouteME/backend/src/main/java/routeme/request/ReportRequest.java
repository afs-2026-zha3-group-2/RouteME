package routeme.request;

public record ReportRequest(String targetType, Long targetId, String reason, String note) {
}