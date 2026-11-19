package routeme.entity;

import java.time.Instant;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import routeme.pojo.TripRouteCompletion;
import routeme.utils.JsonListUtils;

/**
 * trip_route_completions 行对象。completed_stop_indexes 以 JSON 整数数组存储。
 */
@TableName("trip_route_completions")
public class TripRouteCompletionEntity {

    @TableId(type = IdType.INPUT)
    private Long id;

    private Long tripId;

    private Long userId;

    private String completedStopIndexes;

    private Integer plannedStopCount;

    private String createdAt;

    public static TripRouteCompletionEntity from(TripRouteCompletion completion) {
        TripRouteCompletionEntity entity = new TripRouteCompletionEntity();
        entity.setId(completion.id());
        entity.setTripId(completion.tripId());
        entity.setUserId(completion.userId());
        entity.setCompletedStopIndexes(JsonListUtils.writeInts(completion.completedStopIndexes()));
        entity.setPlannedStopCount(completion.plannedStopCount());
        entity.setCreatedAt(completion.createdAt().toString());
        return entity;
    }

    public TripRouteCompletion toTripRouteCompletion() {
        return new TripRouteCompletion(
                id, tripId, userId, JsonListUtils.parseInts(completedStopIndexes),
                plannedStopCount, Instant.parse(createdAt));
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

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getCompletedStopIndexes() {
        return completedStopIndexes;
    }

    public void setCompletedStopIndexes(String completedStopIndexes) {
        this.completedStopIndexes = completedStopIndexes;
    }

    public Integer getPlannedStopCount() {
        return plannedStopCount;
    }

    public void setPlannedStopCount(Integer plannedStopCount) {
        this.plannedStopCount = plannedStopCount;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
}