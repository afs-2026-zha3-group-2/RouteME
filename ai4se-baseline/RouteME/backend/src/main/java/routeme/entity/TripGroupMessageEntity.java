package routeme.entity;

import java.time.Instant;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import routeme.pojo.GroupMessage;

/**
 * trip_group_messages 行对象。
 */
@TableName("trip_group_messages")
public class TripGroupMessageEntity {

    @TableId(type = IdType.INPUT)
    private Long id;

    private Long tripId;

    private Long senderId;

    private String content;

    private String sentAt;

    public static TripGroupMessageEntity from(GroupMessage message) {
        TripGroupMessageEntity entity = new TripGroupMessageEntity();
        entity.setId(message.id());
        entity.setTripId(message.tripId());
        entity.setSenderId(message.senderId());
        entity.setContent(message.content());
        entity.setSentAt(message.sentAt().toString());
        return entity;
    }

    public GroupMessage toGroupMessage() {
        return new GroupMessage(id, tripId, senderId, content, Instant.parse(sentAt));
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

    public Long getSenderId() {
        return senderId;
    }

    public void setSenderId(Long senderId) {
        this.senderId = senderId;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getSentAt() {
        return sentAt;
    }

    public void setSentAt(String sentAt) {
        this.sentAt = sentAt;
    }
}