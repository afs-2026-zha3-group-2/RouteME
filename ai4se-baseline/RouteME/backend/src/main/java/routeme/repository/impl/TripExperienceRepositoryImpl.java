package routeme.repository.impl;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.stereotype.Repository;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

import routeme.entity.TripExperienceEntity;
import routeme.mapper.TripExperienceMapper;
import routeme.model.PageResult;
import routeme.model.TripExperience;
import routeme.repository.TripExperienceRepository;

/**
 * trip_experiences 的持久化适配。分页查询走 TripExperienceMapper.xml（join 行程）。
 */
@Repository
public class TripExperienceRepositoryImpl
        extends AbstractRepositoryImpl<TripExperienceMapper, TripExperienceEntity>
        implements TripExperienceRepository {

    @Override
    public List<TripExperience> findAll() {
        return list(Wrappers.<TripExperienceEntity>lambdaQuery()
                .orderByDesc(TripExperienceEntity::getUpdatedAt)
                .orderByDesc(TripExperienceEntity::getId)).stream()
                .map(TripExperienceEntity::toExperience)
                .toList();
    }

    @Override
    public PageResult<TripExperience> findPage(
            String keyword, String destination, Set<String> tags, int page, int size) {
        IPage<TripExperienceEntity> result = getBaseMapper().selectExperiencePage(
                new Page<>(page, size), keyword, destination, List.copyOf(tags));
        List<TripExperience> experiences = result.getRecords().stream()
                .map(TripExperienceEntity::toExperience)
                .toList();
        return new PageResult<>(experiences, page, size, result.getTotal());
    }

    @Override
    public List<TripExperience> findByTrip(long tripId) {
        return list(Wrappers.<TripExperienceEntity>lambdaQuery()
                .eq(TripExperienceEntity::getTripId, tripId)
                .orderByAsc(TripExperienceEntity::getCreatedAt)
                .orderByAsc(TripExperienceEntity::getId)).stream()
                .map(TripExperienceEntity::toExperience)
                .toList();
    }

    @Override
    public List<TripExperience> findByAuthor(long authorId) {
        return list(Wrappers.<TripExperienceEntity>lambdaQuery()
                .eq(TripExperienceEntity::getAuthorId, authorId)
                .orderByDesc(TripExperienceEntity::getUpdatedAt)
                .orderByDesc(TripExperienceEntity::getId)).stream()
                .map(TripExperienceEntity::toExperience)
                .toList();
    }

    @Override
    public Optional<TripExperience> findByTripAndAuthor(long tripId, long authorId) {
        return lambdaQuery()
                .eq(TripExperienceEntity::getTripId, tripId)
                .eq(TripExperienceEntity::getAuthorId, authorId)
                .oneOpt()
                .map(TripExperienceEntity::toExperience);
    }

    @Override
    public long nextId() {
        return nextId(TripExperienceEntity::getId);
    }

    @Override
    public void insert(TripExperience experience) {
        save(TripExperienceEntity.from(experience));
    }

    @Override
    public void update(TripExperience experience) {
        updateById(TripExperienceEntity.from(experience));
    }
}