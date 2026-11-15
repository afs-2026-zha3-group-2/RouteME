package routeme.service.impl;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

import routeme.enums.TripStatusEnum;
import routeme.exception.ExperienceNotAllowedException;
import routeme.mapper.TripExperienceMapper;
import routeme.param.PageParam;
import routeme.pojo.DemoUser;
import routeme.pojo.PageResult;
import routeme.pojo.TripExperience;
import routeme.entity.TripExperienceEntity;
import routeme.pojo.TripPlan;
import routeme.request.ExperienceWriteRequest;
import routeme.response.ExperienceResponse;
import routeme.response.ExperienceSaveResponse;
import routeme.service.ApplicationService;
import routeme.service.DemoUserService;
import routeme.service.ExperienceService;
import routeme.service.TripPlanService;

/**
 * 游后体验的业务实现：分享资格判定与 (行程, 作者) 上的 upsert。
 * 方法契约以 {@link routeme.service.ExperienceService} 为准。
 */
@Service
public class ExperienceServiceImpl
        extends AbstractServiceImpl<TripExperienceMapper, TripExperienceEntity>
        implements ExperienceService {

    private final TripPlanService tripPlanService;
    private final ApplicationService applicationService;
    private final DemoUserService demoUserService;
    private final Clock clock;

    public ExperienceServiceImpl(
            TripPlanService tripPlanService,
            ApplicationService applicationService,
            DemoUserService demoUserService,
            Clock clock) {
        this.tripPlanService = tripPlanService;
        this.applicationService = applicationService;
        this.demoUserService = demoUserService;
        this.clock = clock;
    }

    @Override
    @Transactional
    public ExperienceSaveResponse upsert(long tripId, long authorId, ExperienceWriteRequest request) {
        TripPlan trip = tripPlanService.require(tripId);
        requireCanShare(trip, authorId);
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
        return new ExperienceSaveResponse(describe(saved), created);
    }

    @Override
    public List<ExperienceResponse> listAll(String q, String destination, Set<String> tags) {
        return list(Wrappers.<TripExperienceEntity>lambdaQuery()
                .orderByDesc(TripExperienceEntity::getUpdatedAt)
                .orderByDesc(TripExperienceEntity::getId)).stream()
                .map(TripExperienceEntity::toExperience)
                .filter(experience -> matches(experience, q, destination, tags))
                .map(this::describe)
                .toList();
    }

    @Override
    public PageResult<ExperienceResponse> listPage(
            String q, String destination, Set<String> tags, PageParam param) {
        String keyword = q == null || q.isBlank() ? null : q.trim();
        IPage<TripExperienceEntity> page = baseMapper.selectExperiencePage(
                new Page<>(param.page(), param.size()),
                keyword,
                destination,
                List.copyOf(tags == null ? Set.of() : tags));
        return new PageResult<>(
                page.getRecords().stream().map(TripExperienceEntity::toExperience).map(this::describe).toList(),
                param.page(),
                param.size(),
                page.getTotal());
    }

    @Override
    public List<ExperienceResponse> listByTrip(long tripId) {
        tripPlanService.require(tripId);
        return list(Wrappers.<TripExperienceEntity>lambdaQuery()
                .eq(TripExperienceEntity::getTripId, tripId)
                .orderByAsc(TripExperienceEntity::getCreatedAt)
                .orderByAsc(TripExperienceEntity::getId)).stream()
                .map(TripExperienceEntity::toExperience)
                .map(this::describe)
                .toList();
    }

    @Override
    public List<ExperienceResponse> mine(long authorId) {
        return list(Wrappers.<TripExperienceEntity>lambdaQuery()
                .eq(TripExperienceEntity::getAuthorId, authorId)
                .orderByDesc(TripExperienceEntity::getUpdatedAt)
                .orderByDesc(TripExperienceEntity::getId)).stream()
                .map(TripExperienceEntity::toExperience)
                .map(this::describe)
                .toList();
    }

    private boolean matches(TripExperience experience, String q, String destination, Set<String> tags) {
        TripPlan trip = tripPlanService.require(experience.tripId());
        if (destination != null && !destination.isBlank() && !destination.equals(trip.destination())) {
            return false;
        }
        if (tags != null && !tags.isEmpty() && trip.tags().stream().noneMatch(tags::contains)) {
            return false;
        }
        if (q == null || q.isBlank()) {
            return true;
        }
        String needle = q.trim().toLowerCase();
        String haystack = String.join(" ",
                        trip.title(), trip.destination(), experience.content(), experience.advice())
                .toLowerCase();
        return haystack.contains(needle);
    }

    private void requireCanShare(TripPlan trip, long authorId) {
        if (trip.status() != TripStatusEnum.COMPLETED) {
            throw new ExperienceNotAllowedException(trip.id(), authorId);
        }
        boolean participant = applicationService.participants(trip.id()).stream()
                .anyMatch(user -> user.id() == authorId);
        if (!participant) {
            throw new ExperienceNotAllowedException(trip.id(), authorId);
        }
    }

    private ExperienceResponse describe(TripExperience experience) {
        TripPlan trip = tripPlanService.require(experience.tripId());
        DemoUser publisher = tripPlanService.publisherOf(trip);
        DemoUser author = demoUserService.require(experience.authorId());
        return ExperienceResponse.from(experience, trip, publisher, author);
    }
}