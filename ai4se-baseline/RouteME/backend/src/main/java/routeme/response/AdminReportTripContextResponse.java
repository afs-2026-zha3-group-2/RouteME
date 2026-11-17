package routeme.response;

import com.fasterxml.jackson.annotation.JsonInclude;

/** 举报关联行程摘要（schema {@code AdminReportTripContext}）。 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AdminReportTripContextResponse(
        long id,
        String title,
        String destination,
        String startDate,
        String endDate,
        String status,
        AdminUserRef publisher) {
}