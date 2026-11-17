package routeme.entity;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import routeme.pojo.TripPlan;
import routeme.utils.JsonListUtils;

/**
 * trip_plans 行对象：原始列与 JSON 文本在这里解析，不向上泄漏。
 */
@TableName("trip_plans")
public class TripPlanEntity {

    @TableId(type = IdType.INPUT)
    private Long id;

    private Long publisherId;

    private String title;

    private String destinationCode;

    private String destination;

    private String startDate;

    private String endDate;

    /** JSON 数组文本。 */
    private String stops;

    /** JSON 数组文本；V17 起替代 meeting_area（旧列保留不读写）。 */
    private String meetingAreas;

    private String meetingTime;

    private String note;

    private Integer budgetMinCents;

    private Integer budgetMaxCents;

    /** JSON 数组文本。 */
    private String tags;

    private Integer capacity;

    private Integer joinedCount;

    private String completedAt;

    private String cancelledAt;

    private String cancelReason;

    private String cancelNote;

    private String createdAt;

    private String updatedAt;

    public static TripPlanEntity from(TripPlan trip) {
        TripPlanEntity entity = new TripPlanEntity();
        entity.setId(trip.id());
        entity.setPublisherId(trip.publisherId());
        entity.setTitle(trip.title());
        entity.setDestinationCode(trip.destinationCode());
        entity.setDestination(trip.destination());
        entity.setStartDate(trip.startDate().toString());
        entity.setEndDate(trip.endDate().toString());
        entity.setStops(JsonListUtils.write(trip.stops()));
        entity.setMeetingAreas(JsonListUtils.write(trip.meetingAreas()));
        entity.setMeetingTime(trip.meetingTime());
        entity.setNote(trip.note());
        entity.setBudgetMinCents(trip.budgetMinCents());
        entity.setBudgetMaxCents(trip.budgetMaxCents());
        entity.setTags(JsonListUtils.write(trip.tags()));
        entity.setCapacity(trip.capacity());
        entity.setJoinedCount(trip.joinedCount());
        entity.setCompletedAt(trip.completedAt() == null ? null : trip.completedAt().toString());
        entity.setCancelledAt(trip.cancelledAt() == null ? null : trip.cancelledAt().toString());
        entity.setCancelReason(trip.cancelReason());
        entity.setCancelNote(trip.cancelNote());
        entity.setCreatedAt(trip.createdAt().toString());
        entity.setUpdatedAt(trip.updatedAt().toString());
        return entity;
    }

    public TripPlan toTripPlan() {
        return new TripPlan(
                id,
                publisherId,
                title,
                destinationCode,
                destination,
                LocalDate.parse(startDate),
                LocalDate.parse(endDate),
                JsonListUtils.parse(stops),
                meetingAreas == null ? List.of() : JsonListUtils.parse(meetingAreas),
                meetingTime,
                note,
                budgetMinCents,
                budgetMaxCents,
                JsonListUtils.parse(tags),
                capacity,
                joinedCount,
                completedAt == null ? null : Instant.parse(completedAt),
                Instant.parse(createdAt),
                Instant.parse(updatedAt),
                cancelledAt == null ? null : Instant.parse(cancelledAt),
                cancelReason,
                cancelNote);
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getPublisherId() {
        return publisherId;
    }

    public void setPublisherId(Long publisherId) {
        this.publisherId = publisherId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDestinationCode() {
        return destinationCode;
    }

    public void setDestinationCode(String destinationCode) {
        this.destinationCode = destinationCode;
    }

    public String getDestination() {
        return destination;
    }

    public void setDestination(String destination) {
        this.destination = destination;
    }

    public String getStartDate() {
        return startDate;
    }

    public void setStartDate(String startDate) {
        this.startDate = startDate;
    }

    public String getEndDate() {
        return endDate;
    }

    public void setEndDate(String endDate) {
        this.endDate = endDate;
    }

    public String getStops() {
        return stops;
    }

    public void setStops(String stops) {
        this.stops = stops;
    }

    public String getMeetingAreas() {
        return meetingAreas;
    }

    public void setMeetingAreas(String meetingAreas) {
        this.meetingAreas = meetingAreas;
    }

    public String getMeetingTime() {
        return meetingTime;
    }

    public void setMeetingTime(String meetingTime) {
        this.meetingTime = meetingTime;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public Integer getBudgetMinCents() {
        return budgetMinCents;
    }

    public void setBudgetMinCents(Integer budgetMinCents) {
        this.budgetMinCents = budgetMinCents;
    }

    public Integer getBudgetMaxCents() {
        return budgetMaxCents;
    }

    public void setBudgetMaxCents(Integer budgetMaxCents) {
        this.budgetMaxCents = budgetMaxCents;
    }

    public String getTags() {
        return tags;
    }

    public void setTags(String tags) {
        this.tags = tags;
    }

    public Integer getCapacity() {
        return capacity;
    }

    public void setCapacity(Integer capacity) {
        this.capacity = capacity;
    }

    public Integer getJoinedCount() {
        return joinedCount;
    }

    public void setJoinedCount(Integer joinedCount) {
        this.joinedCount = joinedCount;
    }

    public String getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(String completedAt) {
        this.completedAt = completedAt;
    }

    public String getCancelledAt() {
        return cancelledAt;
    }

    public void setCancelledAt(String cancelledAt) {
        this.cancelledAt = cancelledAt;
    }

    public String getCancelReason() {
        return cancelReason;
    }

    public void setCancelReason(String cancelReason) {
        this.cancelReason = cancelReason;
    }

    public String getCancelNote() {
        return cancelNote;
    }

    public void setCancelNote(String cancelNote) {
        this.cancelNote = cancelNote;
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