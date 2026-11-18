package routeme.service.impl;

import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import routeme.constant.GrowthConstant;
import routeme.entity.ExperienceLikeEntity;
import routeme.entity.TripExperienceEntity;
import routeme.exception.ExperienceNotFoundException;
import routeme.exception.ForbiddenActionException;
import routeme.mapper.ExperienceLikeMapper;
import routeme.mapper.TripExperienceMapper;
import routeme.pojo.ExperienceLikeStat;
import routeme.pojo.GrowthBooking;
import routeme.response.ExperienceLikeResponse;
import routeme.response.ExperienceLikeSaveResponse;
import routeme.service.ExperienceLikeRewardService;
import routeme.service.ExperienceLikeService;
import routeme.service.GrowthService;

/**
 * 体验点赞的业务实现：体验存在性、自赞拒绝与唯一约束兜底。
 * 方法契约以 {@link ExperienceLikeService} 为准。
 */
@Service
public class ExperienceLikeServiceImpl
        extends AbstractServiceImpl<ExperienceLikeMapper, ExperienceLikeEntity>
        implements ExperienceLikeService {

    private static final int INSERT_ATTEMPTS = 3;

    private final TripExperienceMapper experienceMapper;
    private final ExperienceLikeRewardService rewardService;
    private final GrowthService growthService;
    private final Clock clock;

    public ExperienceLikeServiceImpl(
            TripExperienceMapper experienceMapper,
            ExperienceLikeRewardService rewardService,
            GrowthService growthService,
            Clock clock) {
        this.experienceMapper = experienceMapper;
        this.rewardService = rewardService;
        this.growthService = growthService;
        this.clock = clock;
    }

    @Override
    @Transactional
    public ExperienceLikeSaveResponse like(long experienceId, long userId) {
        TripExperienceEntity experience = requireExperience(experienceId);
        if (experience.getAuthorId().longValue() == userId) {
            throw new ForbiddenActionException("cannot like own experience: " + experienceId);
        }
        boolean created = insertLike(experienceId, userId);
        int likeCount = baseMapper.countByExperience(experienceId);
        if (created) {
            rewardService.award(experience.getTripId(), experience.getAuthorId());
            int tier = GrowthConstant.likeTier(likeCount);
            if (tier > 0) {
                growthService.book(GrowthBooking.like(experience.getAuthorId(), experienceId, tier));
            }
        }
        return new ExperienceLikeSaveResponse(
                new ExperienceLikeResponse(experienceId, likeCount, true),
                created);
    }

    @Override
    @Transactional
    public void unlike(long experienceId, long userId) {
        requireExperience(experienceId);
        baseMapper.deleteByExperienceAndUser(experienceId, userId);
    }

    @Override
    public Map<Long, ExperienceLikeStat> statsOf(List<Long> experienceIds, Long viewerId) {
        if (experienceIds == null || experienceIds.isEmpty()) {
            return Map.of();
        }
        long viewer = viewerId == null ? 0L : viewerId;
        Map<Long, ExperienceLikeStat> stats = new LinkedHashMap<>();
        for (ExperienceLikeStat stat : baseMapper.selectStatsByExperienceIds(experienceIds, viewer)) {
            stats.put(stat.experienceId(), stat);
        }
        return stats;
    }

    private TripExperienceEntity requireExperience(long experienceId) {
        TripExperienceEntity experience = experienceMapper.selectById(experienceId);
        if (experience == null) {
            throw new ExperienceNotFoundException(experienceId);
        }
        return experience;
    }

    /**
     * 插入点赞记录；唯一冲突区分两种情形：
     * 已经存在同一（体验, 用户）记录 → 幂等成功；主键与并发请求撞车 → 换 id 重试。
     */
    private boolean insertLike(long experienceId, long userId) {
        for (int attempt = 1; attempt <= INSERT_ATTEMPTS; attempt++) {
            ExperienceLikeEntity entity = new ExperienceLikeEntity();
            entity.setId(nextId(ExperienceLikeEntity::getId));
            entity.setExperienceId(experienceId);
            entity.setUserId(userId);
            entity.setCreatedAt(clock.instant().toString());
            try {
                baseMapper.insert(entity);
                return true;
            } catch (DuplicateKeyException exception) {
                if (alreadyLiked(experienceId, userId)) {
                    return false;
                }
            }
        }
        throw new IllegalStateException(
                "could not persist like for experience " + experienceId + " and user " + userId);
    }

    private boolean alreadyLiked(long experienceId, long userId) {
        return baseMapper.selectCount(Wrappers.<ExperienceLikeEntity>lambdaQuery()
                .eq(ExperienceLikeEntity::getExperienceId, experienceId)
                .eq(ExperienceLikeEntity::getUserId, userId)) > 0;
    }
}
