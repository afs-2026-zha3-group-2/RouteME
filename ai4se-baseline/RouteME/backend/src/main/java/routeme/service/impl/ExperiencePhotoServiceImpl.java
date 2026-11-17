package routeme.service.impl;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import routeme.entity.TripExperiencePhotoEntity;
import routeme.exception.InvalidInputException;
import routeme.mapper.TripExperiencePhotoMapper;
import routeme.pojo.ExperiencePhotoFile;
import routeme.pojo.TripPlan;
import routeme.response.ExperiencePhotoResponse;
import routeme.service.ExperienceEligibility;
import routeme.service.ExperiencePhotoService;
import routeme.service.TripPlanService;
import routeme.utils.ExperiencePhotoStorage;
import routeme.utils.PhotoMagic;
import routeme.utils.PhotoMetadataStripper;

/**
 * 体验图片上传：资格、大小、魔数、数量、元数据剥离与孤儿懒清理。
 */
@Service
public class ExperiencePhotoServiceImpl
        extends AbstractServiceImpl<TripExperiencePhotoMapper, TripExperiencePhotoEntity>
        implements ExperiencePhotoService {

    private static final Duration UNOWNED_TTL = Duration.ofHours(24);

    private final TripPlanService tripPlanService;
    private final ExperienceEligibility eligibility;
    private final ExperiencePhotoStorage storage;
    private final Clock clock;

    public ExperiencePhotoServiceImpl(
            TripPlanService tripPlanService,
            ExperienceEligibility eligibility,
            ExperiencePhotoStorage storage,
            Clock clock) {
        this.tripPlanService = tripPlanService;
        this.eligibility = eligibility;
        this.storage = storage;
        this.clock = clock;
    }

    @Override
    @Transactional
    public ExperiencePhotoResponse upload(long tripId, long authorId, MultipartFile file) {
        TripPlan trip = tripPlanService.requireCurrent(tripId);
        eligibility.requireCanShare(trip, authorId);

        byte[] content = readBytes(file);
        if (content.length == 0) {
            throw new InvalidInputException("experience photo is required");
        }
        if (content.length > PhotoMagic.MAX_BYTES) {
            throw new InvalidInputException("experience photo must be at most 5 MB");
        }
        PhotoMagic.Format format = PhotoMagic.detect(content);
        if (format == null) {
            throw new InvalidInputException("experience photo must be jpeg, png or webp");
        }

        Instant now = clock.instant();
        cleanupUnowned(tripId, authorId, now);
        if (baseMapper.countByScope(tripId, authorId) >= MAX_PHOTOS) {
            throw new InvalidInputException("at most 6 photos per trip experience");
        }

        byte[] stripped = PhotoMetadataStripper.strip(content, format);
        String fileName = storage.store(tripId, authorId, format, stripped);
        TripExperiencePhotoEntity entity = new TripExperiencePhotoEntity();
        entity.setId(nextId(TripExperiencePhotoEntity::getId));
        entity.setTripId(tripId);
        entity.setAuthorId(authorId);
        entity.setExperienceId(null);
        entity.setFileName(fileName);
        entity.setMime(format.mime());
        entity.setBytes((long) stripped.length);
        entity.setSortOrder(0);
        entity.setCreatedAt(now.toString());
        try {
            save(entity);
        } catch (RuntimeException exception) {
            storage.deleteQuietly(fileName);
            throw exception;
        }
        return new ExperiencePhotoResponse(entity.getId(), url(entity.getId()));
    }

    public static String url(long photoId) {
        return "/api/experience-photos/" + photoId;
    }

    @Override
    public Optional<ExperiencePhotoFile> load(long photoId) {
        TripExperiencePhotoEntity entity = getById(photoId);
        if (entity == null) {
            return Optional.empty();
        }
        return storage.load(entity.getFileName())
                .map(bytes -> new ExperiencePhotoFile(bytes, entity.getMime()));
    }

    private void cleanupUnowned(long tripId, long authorId, Instant now) {
        String cutoff = now.minus(UNOWNED_TTL).toString();
        List<TripExperiencePhotoEntity> stale = baseMapper.selectUnownedBefore(tripId, authorId, cutoff);
        if (stale.isEmpty()) {
            return;
        }
        baseMapper.deleteByIds(stale.stream().map(TripExperiencePhotoEntity::getId).toList());
        stale.forEach(photo -> storage.deleteQuietly(photo.getFileName()));
    }

    private byte[] readBytes(MultipartFile file) {
        if (file == null) {
            return new byte[0];
        }
        try {
            return file.getBytes();
        } catch (IOException exception) {
            throw new UncheckedIOException("cannot read uploaded experience photo", exception);
        }
    }
}
