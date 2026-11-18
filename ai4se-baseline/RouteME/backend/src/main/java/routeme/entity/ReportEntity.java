package routeme.entity;

import java.time.Instant;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import routeme.pojo.Report;

/**
 * {@code reports} row. Columns added by V19 carry the processing workflow (design §2.2).
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

    private Long contextTripId;

    private String createdAt;

    private String status;

    private Long processedBy;

    private String processingAt;

    private String resolvedAt;

    private String resolutionNote;

    private String resolutionAction;

    private String violationType;

    private Integer appliedDeduction;

    public static ReportEntity from(Report report) {
        ReportEntity entity = new ReportEntity();
        entity.setId(report.id());
        entity.setTargetType(report.targetType());
        entity.setTargetId(report.targetId());
        entity.setReporterId(report.reporterId());
        entity.setReason(report.reason());
        entity.setNote(report.note());
        entity.setContextTripId(report.contextTripId());
        entity.setCreatedAt(report.createdAt().toString());
        entity.setStatus(report.status());
        entity.setProcessedBy(report.processedBy());
        entity.setProcessingAt(report.processingAt() == null ? null : report.processingAt().toString());
        entity.setResolvedAt(report.resolvedAt() == null ? null : report.resolvedAt().toString());
        entity.setResolutionNote(report.resolutionNote());
        entity.setResolutionAction(report.resolutionAction());
        entity.setViolationType(report.violationType());
        entity.setAppliedDeduction(report.appliedDeduction());
        return entity;
    }

    public Report toReport() {
        return new Report(
                id,
                targetType,
                targetId,
                reporterId,
                reason,
                note,
                contextTripId,
                Instant.parse(createdAt),
                status,
                processedBy,
                processingAt == null ? null : Instant.parse(processingAt),
                resolvedAt == null ? null : Instant.parse(resolvedAt),
                resolutionNote,
                resolutionAction,
                violationType,
                appliedDeduction);
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

    public Long getContextTripId() {
        return contextTripId;
    }

    public void setContextTripId(Long contextTripId) {
        this.contextTripId = contextTripId;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Long getProcessedBy() {
        return processedBy;
    }

    public void setProcessedBy(Long processedBy) {
        this.processedBy = processedBy;
    }

    public String getProcessingAt() {
        return processingAt;
    }

    public void setProcessingAt(String processingAt) {
        this.processingAt = processingAt;
    }

    public String getResolvedAt() {
        return resolvedAt;
    }

    public void setResolvedAt(String resolvedAt) {
        this.resolvedAt = resolvedAt;
    }

    public String getResolutionNote() {
        return resolutionNote;
    }

    public void setResolutionNote(String resolutionNote) {
        this.resolutionNote = resolutionNote;
    }

    public String getResolutionAction() {
        return resolutionAction;
    }

    public void setResolutionAction(String resolutionAction) {
        this.resolutionAction = resolutionAction;
    }

    public String getViolationType() {
        return violationType;
    }

    public void setViolationType(String violationType) {
        this.violationType = violationType;
    }

    public Integer getAppliedDeduction() {
        return appliedDeduction;
    }

    public void setAppliedDeduction(Integer appliedDeduction) {
        this.appliedDeduction = appliedDeduction;
    }
}