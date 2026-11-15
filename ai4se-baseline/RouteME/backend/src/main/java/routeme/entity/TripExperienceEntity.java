package routeme.entity;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;

import routeme.enums.ExperienceIntensityEnum;
import routeme.model.TripExperience;

public record TripExperienceEntity(
        long id,
        long tripId,
        long authorId,
        String content,
        String intensity,
        String advice,
        String createdAt,
        String updatedAt) {

    public static TripExperienceEntity from(ResultSet resultSet) throws SQLException {
        return new TripExperienceEntity(
                resultSet.getLong("id"),
                resultSet.getLong("trip_id"),
                resultSet.getLong("author_id"),
                resultSet.getString("content"),
                resultSet.getString("intensity"),
                resultSet.getString("advice"),
                resultSet.getString("created_at"),
                resultSet.getString("updated_at"));
    }

    public TripExperience toExperience() {
        return new TripExperience(
                id,
                tripId,
                authorId,
                content,
                ExperienceIntensityEnum.valueOf(intensity),
                advice,
                Instant.parse(createdAt),
                Instant.parse(updatedAt));
    }
}