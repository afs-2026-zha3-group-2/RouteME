package routeme.model;

import java.time.Instant;

import routeme.enums.ExperienceIntensityEnum;
import routeme.exception.InvalidInputException;

/**
 * 游后体验：同一用户对同一行程只有一条，再次提交即更新。
 */
public record TripExperience(
        long id,
        long tripId,
        long authorId,
        String content,
        ExperienceIntensityEnum intensity,
        String advice,
        Instant createdAt,
        Instant updatedAt) {

    public static final int MIN_CONTENT_LENGTH = 10;
    public static final int MAX_CONTENT_LENGTH = 400;
    public static final int MAX_ADVICE_LENGTH = 120;

    public static TripExperience create(
            long tripId, long authorId, String content, String intensity, String advice, Instant now) {
        String trimmedContent = requireContent(content);
        String trimmedAdvice = requireAdvice(advice);
        return new TripExperience(
                0,
                tripId,
                authorId,
                trimmedContent,
                ExperienceIntensityEnum.fromWire(intensity),
                trimmedAdvice,
                now,
                now);
    }

    public TripExperience withContent(String content, String intensity, String advice, Instant now) {
        return new TripExperience(
                id,
                tripId,
                authorId,
                requireContent(content),
                ExperienceIntensityEnum.fromWire(intensity),
                requireAdvice(advice),
                createdAt,
                now);
    }

    public TripExperience withId(long newId) {
        return new TripExperience(newId, tripId, authorId, content, intensity, advice, createdAt, updatedAt);
    }

    private static String requireContent(String content) {
        String trimmed = content == null ? "" : content.trim();
        if (trimmed.length() < MIN_CONTENT_LENGTH || trimmed.length() > MAX_CONTENT_LENGTH) {
            throw new InvalidInputException("experience content must be between " + MIN_CONTENT_LENGTH
                    + " and " + MAX_CONTENT_LENGTH + " characters");
        }
        return trimmed;
    }

    private static String requireAdvice(String advice) {
        String trimmed = advice == null ? "" : advice.trim();
        if (trimmed.isEmpty()) {
            throw new InvalidInputException("experience advice is required");
        }
        if (trimmed.length() > MAX_ADVICE_LENGTH) {
            throw new InvalidInputException("experience advice must be at most " + MAX_ADVICE_LENGTH + " characters");
        }
        return trimmed;
    }
}