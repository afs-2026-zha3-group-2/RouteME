package routeme.repository.impl;

import org.springframework.stereotype.Repository;

import routeme.entity.ReportEntity;
import routeme.mapper.ReportMapper;
import routeme.model.Report;
import routeme.repository.ReportRepository;

/**
 * reports 的持久化适配。
 */
@Repository
public class ReportRepositoryImpl extends AbstractRepositoryImpl<ReportMapper, ReportEntity>
        implements ReportRepository {

    @Override
    public long nextId() {
        return nextId(ReportEntity::getId);
    }

    @Override
    public void insert(Report report) {
        save(ReportEntity.from(report));
    }
}