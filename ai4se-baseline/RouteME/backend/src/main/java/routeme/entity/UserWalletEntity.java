package routeme.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

/**
 * user_wallet 行对象：每个用户一条，余额唯一真相。
 */
@TableName("user_wallet")
public class UserWalletEntity {

    @TableId(type = IdType.INPUT)
    private Long userId;

    private Integer balanceCents;

    private String createdAt;

    private String updatedAt;

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Integer getBalanceCents() {
        return balanceCents;
    }

    public void setBalanceCents(Integer balanceCents) {
        this.balanceCents = balanceCents;
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