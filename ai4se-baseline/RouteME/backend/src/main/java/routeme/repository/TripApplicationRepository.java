package routeme.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import routeme.enums.ApplicationStatusEnum;
import routeme.model.TripApplication;

public interface TripApplicationRepository {

    List<TripApplication> findByTrip(long tripId);

    List<TripApplication> findByApplicant(long applicantId);

    Optional<TripApplication> findById(long id);

    Optional<TripApplication> findAccepted(long tripId, long applicantId);

    boolean existsActive(long tripId, long applicantId);

    long nextId();

    void insert(TripApplication application);

    void updateStatus(long id, ApplicationStatusEnum status, Instant decidedAt);
}