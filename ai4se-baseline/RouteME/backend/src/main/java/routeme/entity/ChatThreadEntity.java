package routeme.entity;

/**
 * chat_messages 会话聚合的查询投影（不是表对象，只作为自定义查询的返回类型）。
 */
public class ChatThreadEntity {

    private Long tripId;

    private Long otherId;

    private Integer messageCount;

    public Long getTripId() {
        return tripId;
    }

    public void setTripId(Long tripId) {
        this.tripId = tripId;
    }

    public Long getOtherId() {
        return otherId;
    }

    public void setOtherId(Long otherId) {
        this.otherId = otherId;
    }

    public Integer getMessageCount() {
        return messageCount;
    }

    public void setMessageCount(Integer messageCount) {
        this.messageCount = messageCount;
    }
}