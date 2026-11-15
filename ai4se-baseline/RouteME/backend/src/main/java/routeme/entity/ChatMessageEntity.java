package routeme.entity;

import java.time.Instant;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import routeme.pojo.ChatMessage;

/**
 * chat_messages 行对象。
 */
@TableName("chat_messages")
public class ChatMessageEntity {

    @TableId(type = IdType.INPUT)
    private Long id;

    private Long tripId;

    private Long senderId;

    private Long receiverId;

    private String content;

    private String sentAt;

    public static ChatMessageEntity from(ChatMessage message) {
        ChatMessageEntity entity = new ChatMessageEntity();
        entity.setId(message.id());
        entity.setTripId(message.tripId());
        entity.setSenderId(message.senderId());
        entity.setReceiverId(message.receiverId());
        entity.setContent(message.content());
        entity.setSentAt(message.sentAt().toString());
        return entity;
    }

    public ChatMessage toChatMessage() {
        return new ChatMessage(id, tripId, senderId, receiverId, content, Instant.parse(sentAt));
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

    public Long getReceiverId() {
        return receiverId;
    }

    public void setReceiverId(Long receiverId) {
        this.receiverId = receiverId;
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