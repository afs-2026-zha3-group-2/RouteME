package routeme.dao;

import java.util.List;
import java.util.Optional;
import routeme.model.TripExperience;

public interface TripExperienceRepository {

    List<TripExperience> findAll();

    List<TripExperience> findByTrip(long tripId);

    List<TripExperience> findByAuthor(long authorId);

    Optional<TripExperience> findByTripAndAuthor(long tripId, long authorId);

    long nextId();

    void insert(TripExperience experience);

    void update(TripExperience experience);
}