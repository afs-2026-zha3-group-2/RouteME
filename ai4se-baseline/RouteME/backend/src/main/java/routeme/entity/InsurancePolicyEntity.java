package routeme.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

/**
 * insurance_policy 行对象：只存第三方投保结果，不存任何投保敏感信息。
 */
@TableName("insurance_policy")
public class InsurancePolicyEntity {

    @TableId(type = IdType.INPUT)
    private Long id;

    private Long userId;

    private Long tripId;

    private String provider;

    private String coverageStart;

    private String coverageEnd;

    private String status;

    private String confirmedAt;

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

    public Long getTripId() {
        return tripId;
    }

    public void setTripId(Long tripId) {
        this.tripId = tripId;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getCoverageStart() {
        return coverageStart;
    }

    public void setCoverageStart(String coverageStart) {
        this.coverageStart = coverageStart;
    }

    public String getCoverageEnd() {
        return coverageEnd;
    }

    public void setCoverageEnd(String coverageEnd) {
        this.coverageEnd = coverageEnd;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getConfirmedAt() {
        return confirmedAt;
    }

    public void setConfirmedAt(String confirmedAt) {
        this.confirmedAt = confirmedAt;
    }
}