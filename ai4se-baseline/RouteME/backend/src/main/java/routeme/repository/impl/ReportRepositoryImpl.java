package routeme.repository.impl;

import org.springframework.stereotype.Repository;

import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

import routeme.entity.ReportEntity;
import routeme.mapper.ReportMapper;
import routeme.model.Report;
import routeme.repository.ReportRepository;

/**
 * reports 的持久化适配。
 */
@Repository
public class ReportRepositoryImpl extends ServiceImpl<ReportMapper, ReportEntity>
        implements ReportRepository {

    @Override
    public long nextId() {
        return getBaseMapper().selectNextId();
    }

    @Override
    public void insert(Report report) {
        save(ReportEntity.from(report));
    }
}