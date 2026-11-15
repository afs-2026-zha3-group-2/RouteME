package routeme.dao;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import routeme.model.Report;

@Repository
public class DatabaseReportRepository implements ReportRepository {

    private final JdbcClient jdbcClient;

    public DatabaseReportRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    public long nextId() {
        return jdbcClient.sql("SELECT COALESCE(MAX(id), 0) + 1 FROM reports")
                .query(Long.class)
                .single();
    }

    @Override
    public void insert(Report report) {
        jdbcClient.sql("""
                        INSERT INTO reports (id, target_type, target_id, reporter_id, reason, note, created_at)
                        VALUES (:id, :targetType, :targetId, :reporterId, :reason, :note, :createdAt)
                        """)
                .param("id", report.id())
                .param("targetType", report.targetType())
                .param("targetId", report.targetId())
                .param("reporterId", report.reporterId())
                .param("reason", report.reason())
                .param("note", report.note())
                .param("createdAt", report.createdAt().toString())
                .update();
    }
}