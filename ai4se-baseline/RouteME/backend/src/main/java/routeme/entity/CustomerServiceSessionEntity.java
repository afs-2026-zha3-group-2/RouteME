package routeme.entity;

import java.time.Instant;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import routeme.pojo.CustomerServiceSession;

/** {@code customer_service_sessions} row。 */
@TableName("customer_service_sessions")
public class CustomerServiceSessionEntity {

    @TableId(type = IdType.INPUT)
    private Long id;

    private Long userId;

    private String status;

    private String createdAt;

    private String joinedAt;

    private Long joinedBy;

    private String closedAt;

    private Long closedBy;

    private String resolvedAt;

    private Long resolvedBy;

    public CustomerServiceSession toSession() {
        return new CustomerServiceSession(
                id,
                userId,
                status,
                Instant.parse(createdAt),
                joinedAt == null ? null : Instant.parse(joinedAt),
                joinedBy,
                closedAt == null ? null : Instant.parse(closedAt),
                closedBy,
                resolvedAt == null ? null : Instant.parse(resolvedAt),
                resolvedBy);
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getJoinedAt() {
        return joinedAt;
    }

    public void setJoinedAt(String joinedAt) {
        this.joinedAt = joinedAt;
    }

    public Long getJoinedBy() {
        return joinedBy;
    }

    public void setJoinedBy(Long joinedBy) {
        this.joinedBy = joinedBy;
    }

    public String getClosedAt() {
        return closedAt;
    }

    public void setClosedAt(String closedAt) {
        this.closedAt = closedAt;
    }

    public Long getClosedBy() {
        return closedBy;
    }

    public void setClosedBy(Long closedBy) {
        this.closedBy = closedBy;
    }

    public String getResolvedAt() {
        return resolvedAt;
    }

    public void setResolvedAt(String resolvedAt) {
        this.resolvedAt = resolvedAt;
    }

    public Long getResolvedBy() {
        return resolvedBy;
    }

    public void setResolvedBy(Long resolvedBy) {
        this.resolvedBy = resolvedBy;
    }
}