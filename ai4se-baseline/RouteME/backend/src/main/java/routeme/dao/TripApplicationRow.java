package routeme.dao;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import routeme.model.ApplicationStatus;
import routeme.model.TripApplication;

record TripApplicationRow(
        long id,
        long tripId,
        long applicantId,
        String message,
        String status,
        String createdAt,
        String decidedAt) {

    static TripApplicationRow from(ResultSet resultSet) throws SQLException {
        return new TripApplicationRow(
                resultSet.getLong("id"),
                resultSet.getLong("trip_id"),
                resultSet.getLong("applicant_id"),
                resultSet.getString("message"),
                resultSet.getString("status"),
                resultSet.getString("created_at"),
                resultSet.getString("decided_at"));
    }

    TripApplication toApplication() {
        return new TripApplication(
                id,
                tripId,
                applicantId,
                message,
                ApplicationStatus.valueOf(status),
                Instant.parse(createdAt),
                decidedAt == null ? null : Instant.parse(decidedAt));
    }
}