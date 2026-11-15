package routeme.dao;

import java.util.List;
import java.util.Optional;
import routeme.model.TripPlan;

public interface TripPlanRepository {

    List<TripPlan> findUnfinished();

    Optional<TripPlan> findById(long id);

    long nextId();

    void insert(TripPlan trip);
}