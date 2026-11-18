package routeme.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

/**
 * user_growth_account 行对象：每个用户一条，当前总经验是唯一真相。
 */
@TableName("user_growth_account")
public class UserGrowthAccountEntity {

    @TableId(type = IdType.INPUT)
    private Long userId;

    private Integer expTotal;

    private String createdAt;

    private String updatedAt;

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Integer getExpTotal() {
        return expTotal;
    }

    public void setExpTotal(Integer expTotal) {
        this.expTotal = expTotal;
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
