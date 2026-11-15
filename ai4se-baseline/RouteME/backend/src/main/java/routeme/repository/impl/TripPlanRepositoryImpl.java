package routeme.repository.impl;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

import routeme.entity.TripPlanEntity;
import routeme.mapper.TripPlanMapper;
import routeme.model.PageResult;
import routeme.model.TripPlan;
import routeme.repository.TripPlanRepository;
import routeme.request.TripQuery;

/**
 * trip_plans 的持久化适配。分页查询走 TripPlanMapper.xml，其余用条件构造器。
 */
@Repository
public class TripPlanRepositoryImpl extends ServiceImpl<TripPlanMapper, TripPlanEntity>
        implements TripPlanRepository {

    @Override
    public List<TripPlan> findAll() {
        return list(Wrappers.<TripPlanEntity>lambdaQuery()
                .orderByDesc(TripPlanEntity::getCreatedAt)
                .orderByDesc(TripPlanEntity::getId)).stream()
                .map(TripPlanEntity::toTripPlan)
                .toList();
    }

    @Override
    public List<TripPlan> findUnfinished() {
        return list(Wrappers.<TripPlanEntity>lambdaQuery()
                .isNull(TripPlanEntity::getCompletedAt)
                .orderByAsc(TripPlanEntity::getStartDate)
                .orderByDesc(TripPlanEntity::getCreatedAt)
                .orderByDesc(TripPlanEntity::getId)).stream()
                .map(TripPlanEntity::toTripPlan)
                .toList();
    }

    @Override
    public PageResult<TripPlan> findOpenPage(TripQuery query, int page, int size) {
        String sort = query.sort() == TripQuery.SortOrder.NEW ? "new" : "date";
        IPage<TripPlanEntity> result = getBaseMapper().selectOpenPage(
                new Page<>(page, size),
                query.keyword(),
                query.destination(),
                query.dateFrom() == null ? null : query.dateFrom().toString(),
                query.dateTo() == null ? null : query.dateTo().toString(),
                List.copyOf(query.tags()),
                sort);
        List<TripPlan> trips = result.getRecords().stream().map(TripPlanEntity::toTripPlan).toList();
        return new PageResult<>(trips, page, size, result.getTotal());
    }

    @Override
    public Optional<TripPlan> findById(long id) {
        return Optional.ofNullable(getById(id)).map(TripPlanEntity::toTripPlan);
    }

    @Override
    public Optional<TripPlan> findLatestUnfinishedByPublisher(long publisherId) {
        return lambdaQuery()
                .eq(TripPlanEntity::getPublisherId, publisherId)
                .isNull(TripPlanEntity::getCompletedAt)
                .orderByDesc(TripPlanEntity::getCreatedAt)
                .orderByDesc(TripPlanEntity::getId)
                .last("LIMIT 1")
                .oneOpt()
                .map(TripPlanEntity::toTripPlan);
    }

    @Override
    public long nextId() {
        return getBaseMapper().selectNextId();
    }

    @Override
    public void insert(TripPlan trip) {
        save(TripPlanEntity.from(trip));
    }

    @Override
    public void updateJoinedCount(long id, int joinedCount, Instant updatedAt) {
        lambdaUpdate()
                .eq(TripPlanEntity::getId, id)
                .set(TripPlanEntity::getJoinedCount, joinedCount)
                .set(TripPlanEntity::getUpdatedAt, updatedAt.toString())
                .update();
    }

    @Override
    public void markCompleted(long id, Instant completedAt) {
        lambdaUpdate()
                .eq(TripPlanEntity::getId, id)
                .set(TripPlanEntity::getCompletedAt, completedAt.toString())
                .set(TripPlanEntity::getUpdatedAt, completedAt.toString())
                .update();
    }
}