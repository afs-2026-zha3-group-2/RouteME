package routeme.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

/**
 * credit_exit_attachment 行对象：退出证明图片的元数据，文件本体在本地磁盘。
 * exitEventId 为空表示已上传但尚未随退出提交。
 */
@TableName("credit_exit_attachment")
public class CreditExitAttachmentEntity {

    @TableId(type = IdType.INPUT)
    private Long id;
    private Long exitEventId;
    private Long userId;
    private Long tripId;
    private String fileName;
    private String originalName;
    private String contentType;
    private Long sizeBytes;
    private String createdAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getExitEventId() {
        return exitEventId;
    }

    public void setExitEventId(Long exitEventId) {
        this.exitEventId = exitEventId;
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

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getOriginalName() {
        return originalName;
    }

    public void setOriginalName(String originalName) {
        this.originalName = originalName;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public Long getSizeBytes() {
        return sizeBytes;
    }

    public void setSizeBytes(Long sizeBytes) {
        this.sizeBytes = sizeBytes;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
}
