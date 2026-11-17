package routeme.service.impl;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

import routeme.entity.TripExperienceEntity;
import routeme.entity.TripExperiencePhotoEntity;
import routeme.enums.WriteScopeEnum;
import routeme.exception.ForbiddenActionException;
import routeme.exception.InvalidInputException;
import routeme.mapper.TripExperienceMapper;
import routeme.mapper.TripExperiencePhotoMapper;
import routeme.param.PageParam;
import routeme.pojo.DemoUser;
import routeme.pojo.ExperienceLikeStat;
import routeme.pojo.PageResult;
import routeme.pojo.TripExperience;
import routeme.pojo.TripPlan;
import routeme.request.ExperienceWriteRequest;
import routeme.response.ExperiencePhotoResponse;
import routeme.response.ExperienceResponse;
import routeme.response.ExperienceSaveResponse;
import routeme.service.AccountStatusService;
import routeme.service.DemoUserService;
import routeme.service.ExperienceEligibility;
import routeme.service.ExperienceLikeService;
import routeme.service.ExperiencePhotoService;
import routeme.service.ExperienceService;
import routeme.service.TripPlanService;
import routeme.utils.ExperiencePhotoStorage;

/**
 * 游后体验的业务实现：分享资格判定与 (行程, 作者) 上的 upsert。
 * 方法契约以 {@link routeme.service.ExperienceService} 为准。
 */
@Service
public class ExperienceServiceImpl
        extends AbstractServiceImpl<TripExperienceMapper, TripExperienceEntity>
        implements ExperienceService {

    private final TripPlanService tripPlanService;
    private final DemoUserService demoUserService;
    private final TripExperiencePhotoMapper photoMapper;
    private final ExperiencePhotoStorage photoStorage;
    private final ExperienceEligibility eligibility;
    private final ExperienceLikeService experienceLikeService;
    private final Clock clock;
    private final AccountStatusService accountStatusService;

    public ExperienceServiceImpl(
            TripPlanService tripPlanService,
            DemoUserService demoUserService,
            TripExperiencePhotoMapper photoMapper,
            ExperiencePhotoStorage photoStorage,
            ExperienceEligibility eligibility,
            ExperienceLikeService experienceLikeService,
            Clock clock,
            AccountStatusService accountStatusService) {
        this.tripPlanService = tripPlanService;
        this.demoUserService = demoUserService;
        this.photoMapper = photoMapper;
        this.photoStorage = photoStorage;
        this.eligibility = eligibility;
        this.experienceLikeService = experienceLikeService;
        this.clock = clock;
        this.accountStatusService = accountStatusService;
    }

    @Override
    @Transactional
    public ExperienceSaveResponse upsert(long tripId, long authorId, ExperienceWriteRequest request) {
        accountStatusService.assertCanWrite(authorId, WriteScopeEnum.BUSINESS);
        TripPlan trip = tripPlanService.requireCurrent(tripId);
        eligibility.requireCanShare(trip, authorId);
        List<Long> photoIds = normalizePhotoIds(request.photoIdsOrDefault());
        Instant now = clock.instant();
        Optional<TripExperienceEntity> existing = lambdaQuery()
                .eq(TripExperienceEntity::getTripId, tripId)
                .eq(TripExperienceEntity::getAuthorId, authorId)
                .oneOpt();
        TripExperience saved;
        boolean created;
        if (existing.isEmpty()) {
            saved = TripExperience.create(
                            tripId, authorId, request.content(), request.intensity(), request.advice(), now)
                    .withId(nextId(TripExperienceEntity::getId));
            save(TripExperienceEntity.from(saved));
            created = true;
        } else {
            saved = existing.get().toExperience()
                    .withContent(request.content(), request.intensity(), request.advice(), now);
            updateById(TripExperienceEntity.from(saved));
            created = false;
        }
        List<TripExperiencePhotoEntity> removed = bindPhotos(tripId, authorId, saved.id(), photoIds);
        deleteAfterCommit(removed);
        return new ExperienceSaveResponse(describe(saved, authorId), created);
    }

    @Override
    public List<ExperienceResponse> listAll(String destinationCode, Set<String> tags, Long viewerId) {
        List<TripExperience> experiences = list(Wrappers.<TripExperienceEntity>lambdaQuery()
                .orderByDesc(TripExperienceEntity::getUpdatedAt)
                .orderByDesc(TripExperienceEntity::getId)).stream()
                .map(TripExperienceEntity::toExperience)
                .filter(experience -> matches(experience, destinationCode, tags))
                .toList();
        return describeAll(experiences, viewerId);
    }

    @Override
    public PageResult<ExperienceResponse> listPage(
            String destinationCode, LocalDate dateFrom, LocalDate dateTo, Set<String> tags, PageParam param,
            Long viewerId) {
        IPage<TripExperienceEntity> page = baseMapper.selectExperiencePage(
                new Page<>(param.page(), param.size()),
                destinationCode,
                dateFrom == null ? null : dateFrom.toString(),
                dateTo == null ? null : dateTo.toString(),
                List.copyOf(tags == null ? Set.of() : tags));
        return new PageResult<>(
                describeAll(page.getRecords().stream().map(TripExperienceEntity::toExperience).toList(), viewerId),
                param.page(),
                param.size(),
                page.getTotal());
    }

    @Override
    public List<ExperienceResponse> listByTrip(long tripId, Long viewerId) {
        tripPlanService.requireCurrent(tripId);
        return describeAll(list(Wrappers.<TripExperienceEntity>lambdaQuery()
                .eq(TripExperienceEntity::getTripId, tripId)
                .orderByAsc(TripExperienceEntity::getCreatedAt)
                .orderByAsc(TripExperienceEntity::getId)).stream()
                .map(TripExperienceEntity::toExperience)
                .toList(), viewerId);
    }

    @Override
    public List<ExperienceResponse> mine(long authorId) {
        return describeAll(list(Wrappers.<TripExperienceEntity>lambdaQuery()
                .eq(TripExperienceEntity::getAuthorId, authorId)
                .orderByDesc(TripExperienceEntity::getUpdatedAt)
                .orderByDesc(TripExperienceEntity::getId)).stream()
                .map(TripExperienceEntity::toExperience)
                .toList(), authorId);
    }

    private boolean matches(TripExperience experience, String destinationCode, Set<String> tags) {
        TripPlan trip = tripPlanService.require(experience.tripId());
        if (destinationCode != null && !destinationCode.isBlank()
                && !destinationCode.equals(trip.destinationCode())) {
            return false;
        }
        if (tags != null && !tags.isEmpty() && trip.tags().stream().noneMatch(tags::contains)) {
            return false;
        }
        return true;
    }

    private List<Long> normalizePhotoIds(List<Long> raw) {
        if (raw == null || raw.isEmpty()) {
            return List.of();
        }
        LinkedHashSet<Long> unique = new LinkedHashSet<>();
        for (Long photoId : raw) {
            if (photoId == null) {
                throw new InvalidInputException("experience photo id is required");
            }
            unique.add(photoId);
        }
        if (unique.size() > ExperiencePhotoService.MAX_PHOTOS) {
            throw new InvalidInputException(
                    "at most " + ExperiencePhotoService.MAX_PHOTOS + " photos per experience");
        }
        return List.copyOf(unique);
    }

    /**
     * 整体替换当前体验的图片绑定；返回被移除的旧行（文件在事务提交后删除）。
     */
    private List<TripExperiencePhotoEntity> bindPhotos(
            long tripId, long authorId, long experienceId, List<Long> photoIds) {
        List<TripExperiencePhotoEntity> existing = photoMapper.selectByExperience(experienceId);
        List<TripExperiencePhotoEntity> requested = loadRequestedPhotos(tripId, authorId, experienceId, photoIds);
        Set<Long> requestedIds = requested.stream()
                .map(TripExperiencePhotoEntity::getId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        List<TripExperiencePhotoEntity> removed = existing.stream()
                .filter(photo -> !requestedIds.contains(photo.getId()))
                .toList();
        if (!removed.isEmpty()) {
            photoMapper.deleteByIds(removed.stream().map(TripExperiencePhotoEntity::getId).toList());
        }
        for (int index = 0; index < requested.size(); index++) {
            photoMapper.bind(requested.get(index).getId(), experienceId, index);
        }
        return removed;
    }

    private List<TripExperiencePhotoEntity> loadRequestedPhotos(
            long tripId, long authorId, long experienceId, List<Long> photoIds) {
        if (photoIds.isEmpty()) {
            return List.of();
        }
        Map<Long, TripExperiencePhotoEntity> byId = photoMapper.selectBatchIds(photoIds).stream()
                .collect(Collectors.toMap(TripExperiencePhotoEntity::getId, photo -> photo));
        List<TripExperiencePhotoEntity> ordered = new ArrayList<>(photoIds.size());
        for (Long photoId : photoIds) {
            TripExperiencePhotoEntity photo = byId.get(photoId);
            if (photo == null) {
                throw new InvalidInputException("experience photo " + photoId + " not found");
            }
            if (photo.getTripId() != tripId || photo.getAuthorId() != authorId) {
                throw new ForbiddenActionException("experience photo " + photoId + " belongs to another user");
            }
            if (photo.getExperienceId() != null && photo.getExperienceId() != experienceId) {
                throw new InvalidInputException("experience photo " + photoId + " is already bound");
            }
            ordered.add(photo);
        }
        return ordered;
    }

    private void deleteAfterCommit(List<TripExperiencePhotoEntity> removed) {
        if (removed.isEmpty()) {
            return;
        }
        List<String> fileNames = removed.stream().map(TripExperiencePhotoEntity::getFileName).toList();
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            fileNames.forEach(photoStorage::deleteQuietly);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                fileNames.forEach(photoStorage::deleteQuietly);
            }
        });
    }

    private List<ExperienceResponse> describeAll(List<TripExperience> experiences, Long viewerId) {
        List<Long> experienceIds = experiences.stream().map(TripExperience::id).toList();
        Map<Long, List<ExperiencePhotoResponse>> photos = photosOf(experienceIds);
        Map<Long, ExperienceLikeStat> likes = experienceLikeService.statsOf(experienceIds, viewerId);
        return experiences.stream().map(experience -> describe(experience, photos, likes)).toList();
    }

    private Map<Long, List<ExperiencePhotoResponse>> photosOf(List<Long> experienceIds) {
        if (experienceIds.isEmpty()) {
            return Map.of();
        }
        return photoMapper.selectByExperienceIds(experienceIds).stream()
                .collect(Collectors.groupingBy(
                        TripExperiencePhotoEntity::getExperienceId,
                        LinkedHashMap::new,
                        Collectors.mapping(
                                photo -> new ExperiencePhotoResponse(
                                        photo.getId(), ExperiencePhotoServiceImpl.url(photo.getId())),
                                Collectors.toList())));
    }

    private ExperienceResponse describe(TripExperience experience, Long viewerId) {
        return describe(
                experience,
                photosOf(List.of(experience.id())),
                experienceLikeService.statsOf(List.of(experience.id()), viewerId));
    }

    private ExperienceResponse describe(
            TripExperience experience,
            Map<Long, List<ExperiencePhotoResponse>> photos,
            Map<Long, ExperienceLikeStat> likes) {
        TripPlan trip = tripPlanService.requireCurrent(experience.tripId());
        DemoUser publisher = tripPlanService.publisherOf(trip);
        DemoUser author = demoUserService.require(experience.authorId());
        ExperienceLikeStat like = likes.getOrDefault(
                experience.id(), ExperienceLikeStat.empty(experience.id()));
        return ExperienceResponse.from(experience, trip, publisher, author, clock.instant(),
                photos.getOrDefault(experience.id(), List.of()), like.likeCount(), like.liked());
    }
}