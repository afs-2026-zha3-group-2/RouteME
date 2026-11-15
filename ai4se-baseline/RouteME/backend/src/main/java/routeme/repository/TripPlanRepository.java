package routeme.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import routeme.model.PageResult;
import routeme.model.TripPlan;
import routeme.request.TripQuery;

public interface TripPlanRepository {

    List<TripPlan> findAll();

    List<TripPlan> findUnfinished();

    /**
     * 未结束行程的分页查询：过滤、排序与分页在数据库完成。
     */
    PageResult<TripPlan> findOpenPage(TripQuery query, int page, int size);

    Optional<TripPlan> findById(long id);

        Optional<TripPlan> findLatestUnfinishedByPublisher(long publisherId);

        long nextId();

        void insert(TripPlan trip);

        void updateJoinedCount(long id, int joinedCount, Instant updatedAt);

        void markCompleted(long id, Instant completedAt);
    }