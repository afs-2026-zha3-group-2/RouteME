package routeme.dao;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import routeme.model.TripPlan;

public interface TripPlanRepository {

    List<TripPlan> findUnfinished();

    Optional<TripPlan> findById(long id);

        Optional<TripPlan> findLatestUnfinishedByPublisher(long publisherId);

        long nextId();

        void insert(TripPlan trip);

        void updateJoinedCount(long id, int joinedCount, Instant updatedAt);

        void markCompleted(long id, Instant completedAt);
    }