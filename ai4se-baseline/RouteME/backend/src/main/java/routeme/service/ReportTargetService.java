package routeme.service;

import org.springframework.stereotype.Service;

import routeme.entity.TripExperienceEntity;
import routeme.entity.TripPlanEntity;
import routeme.entity.UserEntity;
import routeme.pojo.Report;
import routeme.pojo.TripExperience;
import routeme.pojo.TripPlan;

/**
 * 举报对象的统一推导：用户 / 行程 / 体验三类对象对应的被举报用户、展示名称与
 * 内容摘要都在这里计算，列表、详情与用户详情共用同一份口径。
 */
@Service
public class ReportTargetService {

    private static final int MAX_EXCERPT_LENGTH = 200;

    private final TripPlanService tripPlanService;
    private final ExperienceService experienceService;
    private final DemoUserService demoUserService;

    public ReportTargetService(
            TripPlanService tripPlanService,
            ExperienceService experienceService,
            DemoUserService demoUserService) {
        this.tripPlanService = tripPlanService;
        this.experienceService = experienceService;
        this.demoUserService = demoUserService;
    }

    /** @return 被举报用户 id；目标已不可用时返回 {@code null}。 */
    public Long reportedUserId(Report report) {
        return switch (report.targetType()) {
            case "user" -> demoUserService.getById(report.targetId()) == null ? null : report.targetId();
            case "trip" -> trip(report.targetId()) == null ? null : trip(report.targetId()).publisherId();
            case "experience" -> experience(report.targetId()) == null
                    ? null
                    : experience(report.targetId()).authorId();
            default -> null;
        };
    }

    public String targetLabel(Report report) {
        return switch (report.targetType()) {
            case "user" -> {
                UserEntity user = demoUserService.getById(report.targetId());
                yield user == null ? null : user.getNickname();
            }
            case "trip" -> {
                TripPlan trip = trip(report.targetId());
                yield trip == null ? null : trip.title();
            }
            case "experience" -> {
                TripExperience experience = experience(report.targetId());
                if (experience == null) {
                    yield null;
                }
                TripPlan trip = trip(experience.tripId());
                yield trip == null ? null : trip.title();
            }
            default -> null;
        };
    }

    public boolean targetExists(Report report) {
        return switch (report.targetType()) {
            case "user" -> demoUserService.getById(report.targetId()) != null;
            case "trip" -> trip(report.targetId()) != null;
            case "experience" -> experience(report.targetId()) != null;
            default -> false;
        };
    }

    public String contentExcerpt(Report report) {
        return switch (report.targetType()) {
            case "user" -> {
                UserEntity user = demoUserService.getById(report.targetId());
                yield user == null ? null : truncate(user.getBio());
            }
            case "trip" -> {
                TripPlan trip = trip(report.targetId());
                yield trip == null
                        ? null
                        : truncate(trip.title() + "｜" + trip.destination() + "｜" + trip.startDate());
            }
            case "experience" -> {
                TripExperience experience = experience(report.targetId());
                yield experience == null ? null : truncate(experience.content());
            }
            default -> null;
        };
    }

    private TripPlan trip(long tripId) {
        TripPlanEntity entity = tripPlanService.getById(tripId);
        return entity == null ? null : entity.toTripPlan();
    }

    private TripExperience experience(long experienceId) {
        TripExperienceEntity entity = experienceService.getById(experienceId);
        return entity == null ? null : entity.toExperience();
    }

    private static String truncate(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.length() <= MAX_EXCERPT_LENGTH ? trimmed : trimmed.substring(0, MAX_EXCERPT_LENGTH);
    }
}