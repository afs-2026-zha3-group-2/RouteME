package routeme.entity;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;

import routeme.enums.ApplicationStatusEnum;
import routeme.model.TripApplication;

public record TripApplicationEntity(
        long id,
        long tripId,
        long applicantId,
        String message,
        String status,
        String createdAt,
        String decidedAt) {

    public static TripApplicationEntity from(ResultSet resultSet) throws SQLException {
        return new TripApplicationEntity(
                resultSet.getLong("id"),
                resultSet.getLong("trip_id"),
                resultSet.getLong("applicant_id"),
                resultSet.getString("message"),
                resultSet.getString("status"),
                resultSet.getString("created_at"),
                resultSet.getString("decided_at"));
    }

    public TripApplication toApplication() {
        return new TripApplication(
                id,
                tripId,
                applicantId,
                message,
                ApplicationStatusEnum.valueOf(status),
                Instant.parse(createdAt),
                decidedAt == null ? null : Instant.parse(decidedAt));
    }
}