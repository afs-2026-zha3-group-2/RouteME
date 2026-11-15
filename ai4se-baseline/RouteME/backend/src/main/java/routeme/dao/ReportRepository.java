package routeme.dao;

import routeme.model.Report;

public interface ReportRepository {

    long nextId();

    void insert(Report report);
}