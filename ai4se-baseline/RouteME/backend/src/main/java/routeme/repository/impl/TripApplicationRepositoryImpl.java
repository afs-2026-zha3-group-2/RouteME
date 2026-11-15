package routeme.repository.impl;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import routeme.entity.TripApplicationEntity;
import routeme.enums.ApplicationStatusEnum;
import routeme.mapper.TripApplicationMapper;
import routeme.model.TripApplication;
import routeme.repository.TripApplicationRepository;

/**
 * trip_applications 的持久化适配。
 */
@Repository
public class TripApplicationRepositoryImpl
        extends AbstractRepositoryImpl<TripApplicationMapper, TripApplicationEntity>
        implements TripApplicationRepository {

    @Override
    public List<TripApplication> findByTrip(long tripId) {
        return list(Wrappers.<TripApplicationEntity>lambdaQuery()
                .eq(TripApplicationEntity::getTripId, tripId)
                .orderByAsc(TripApplicationEntity::getCreatedAt)
                .orderByAsc(TripApplicationEntity::getId)).stream()
                .map(TripApplicationEntity::toApplication)
                .toList();
    }

    @Override
    public List<TripApplication> findByApplicant(long applicantId) {
        return list(Wrappers.<TripApplicationEntity>lambdaQuery()
                .eq(TripApplicationEntity::getApplicantId, applicantId)
                .orderByDesc(TripApplicationEntity::getCreatedAt)
                .orderByDesc(TripApplicationEntity::getId)).stream()
                .map(TripApplicationEntity::toApplication)
                .toList();
    }

    @Override
    public Optional<TripApplication> findById(long id) {
        return Optional.ofNullable(getById(id)).map(TripApplicationEntity::toApplication);
    }

    @Override
    public Optional<TripApplication> findAccepted(long tripId, long applicantId) {
        return lambdaQuery()
                .eq(TripApplicationEntity::getTripId, tripId)
                .eq(TripApplicationEntity::getApplicantId, applicantId)
                .eq(TripApplicationEntity::getStatus, ApplicationStatusEnum.ACCEPTED.name())
                .oneOpt()
                .map(TripApplicationEntity::toApplication);
    }

    @Override
    public boolean existsActive(long tripId, long applicantId) {
        return count(Wrappers.<TripApplicationEntity>lambdaQuery()
                .eq(TripApplicationEntity::getTripId, tripId)
                .eq(TripApplicationEntity::getApplicantId, applicantId)
                .in(TripApplicationEntity::getStatus,
                        ApplicationStatusEnum.PENDING.name(),
                        ApplicationStatusEnum.ACCEPTED.name())) > 0;
    }

    @Override
    public long nextId() {
        return nextId(TripApplicationEntity::getId);
    }

    @Override
    public void insert(TripApplication application) {
        save(TripApplicationEntity.from(application));
    }

    @Override
    public void updateStatus(long id, ApplicationStatusEnum status, Instant decidedAt) {
        lambdaUpdate()
                .eq(TripApplicationEntity::getId, id)
                .set(TripApplicationEntity::getStatus, status.name())
                .set(TripApplicationEntity::getDecidedAt, decidedAt == null ? null : decidedAt.toString())
                .update();
    }
}