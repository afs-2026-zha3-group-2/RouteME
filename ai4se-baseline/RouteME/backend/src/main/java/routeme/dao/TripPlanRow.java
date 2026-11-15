package routeme.dao;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import routeme.model.TripPlan;

/**
 * trip_plans 行对象：原始列与 JSON 文本在这里解析，不向上泄漏。
 */
record TripPlanRow(
        long id,
        long publisherId,
        String title,
        String destination,
        String startDate,
        String endDate,
        String stopsJson,
        String meetingArea,
        String note,
        Integer budgetMinCents,
        Integer budgetMaxCents,
        String tagsJson,
        int capacity,
        int joinedCount,
        String completedAt,
        String createdAt,
        String updatedAt) {

    static TripPlanRow from(ResultSet resultSet) throws SQLException {
        long budgetMin = resultSet.getLong("budget_min_cents");
        Integer budgetMinCents = resultSet.wasNull() ? null : Math.toIntExact(budgetMin);
        long budgetMax = resultSet.getLong("budget_max_cents");
        Integer budgetMaxCents = resultSet.wasNull() ? null : Math.toIntExact(budgetMax);
        return new TripPlanRow(
                resultSet.getLong("id"),
                resultSet.getLong("publisher_id"),
                resultSet.getString("title"),
                resultSet.getString("destination"),
                resultSet.getString("start_date"),
                resultSet.getString("end_date"),
                resultSet.getString("stops"),
                resultSet.getString("meeting_area"),
                resultSet.getString("note"),
                budgetMinCents,
                budgetMaxCents,
                resultSet.getString("tags"),
                resultSet.getInt("capacity"),
                resultSet.getInt("joined_count"),
                resultSet.getString("completed_at"),
                resultSet.getString("created_at"),
                resultSet.getString("updated_at"));
    }

    TripPlan toTripPlan() {
        return new TripPlan(
                id,
                publisherId,
                title,
                destination,
                LocalDate.parse(startDate),
                LocalDate.parse(endDate),
                JsonListCodec.parse(stopsJson),
                meetingArea,
                note,
                budgetMinCents,
                budgetMaxCents,
                JsonListCodec.parse(tagsJson),
                capacity,
                joinedCount,
                completedAt == null ? null : Instant.parse(completedAt),
                Instant.parse(createdAt),
                Instant.parse(updatedAt));
    }
}