package routeme.repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import routeme.model.PageResult;
import routeme.model.TripExperience;

public interface TripExperienceRepository {

    List<TripExperience> findAll();

    /**
     * 游后体验的分页查询：目的地、标签与关键词由关联行程与体验正文共同决定。
     */
    PageResult<TripExperience> findPage(String keyword, String destination, Set<String> tags, int page, int size);

    List<TripExperience> findByTrip(long tripId);

    List<TripExperience> findByAuthor(long authorId);

    Optional<TripExperience> findByTripAndAuthor(long tripId, long authorId);

    long nextId();

    void insert(TripExperience experience);

    void update(TripExperience experience);
}