package routeme.entity;

import java.time.Instant;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import routeme.pojo.Report;

/**
 * reports 行对象。
 */
@TableName("reports")
public class ReportEntity {

    @TableId(type = IdType.INPUT)
    private Long id;

    private String targetType;

    private Long targetId;

    private Long reporterId;

    private String reason;

    private String note;

    private String createdAt;

    public static ReportEntity from(Report report) {
        ReportEntity entity = new ReportEntity();
        entity.setId(report.id());
        entity.setTargetType(report.targetType());
        entity.setTargetId(report.targetId());
        entity.setReporterId(report.reporterId());
        entity.setReason(report.reason());
        entity.setNote(report.note());
        entity.setCreatedAt(report.createdAt().toString());
        return entity;
    }

    public Report toReport() {
        return new Report(id, targetType, targetId, reporterId, reason, note, Instant.parse(createdAt));
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTargetType() {
        return targetType;
    }

    public void setTargetType(String targetType) {
        this.targetType = targetType;
    }

    public Long getTargetId() {
        return targetId;
    }

    public void setTargetId(Long targetId) {
        this.targetId = targetId;
    }

    public Long getReporterId() {
        return reporterId;
    }

    public void setReporterId(Long reporterId) {
        this.reporterId = reporterId;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
}