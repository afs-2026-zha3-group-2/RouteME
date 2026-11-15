package routeme.entity;

import java.time.Instant;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import routeme.enums.ExperienceIntensityEnum;
import routeme.model.TripExperience;

/**
 * trip_experiences 行对象。
 */
@TableName("trip_experiences")
public class TripExperienceEntity {

    @TableId(type = IdType.INPUT)
    private Long id;

    private Long tripId;

    private Long authorId;

    private String content;

    private String intensity;

    private String advice;

    private String createdAt;

    private String updatedAt;

    public static TripExperienceEntity from(TripExperience experience) {
        TripExperienceEntity entity = new TripExperienceEntity();
        entity.setId(experience.id());
        entity.setTripId(experience.tripId());
        entity.setAuthorId(experience.authorId());
        entity.setContent(experience.content());
        entity.setIntensity(experience.intensity().name());
        entity.setAdvice(experience.advice());
        entity.setCreatedAt(experience.createdAt().toString());
        entity.setUpdatedAt(experience.updatedAt().toString());
        return entity;
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

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getTripId() {
        return tripId;
    }

    public void setTripId(Long tripId) {
        this.tripId = tripId;
    }

    public Long getAuthorId() {
        return authorId;
    }

    public void setAuthorId(Long authorId) {
        this.authorId = authorId;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getIntensity() {
        return intensity;
    }

    public void setIntensity(String intensity) {
        this.intensity = intensity;
    }

    public String getAdvice() {
        return advice;
    }

    public void setAdvice(String advice) {
        this.advice = advice;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }
}