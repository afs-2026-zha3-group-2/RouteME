package routeme.service.impl;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.extern.slf4j.Slf4j;

import routeme.enums.TripStatusEnum;
import routeme.pojo.DemoUser;
import routeme.pojo.TripPlan;
import routeme.service.ApplicationService;
import routeme.service.NotificationService;
import routeme.service.TripPlanService;

/**
 * 行程生命周期中「没有显式写入动作」的状态（ONGOING）在读取行程详情时惰性物化：
 * 与 {@code materializeExpired} 处理 COMPLETED 的口径一致，只在真正进入旅行中后补一次通知。
 *
 * <p>去重键由通知服务保证，重复打开详情不会重复生成。</p>
 */
@Slf4j
@Service
public class NotificationLifecycleService {

    private final TripPlanService tripPlanService;
    private final ApplicationService applicationService;
    private final NotificationService notificationService;
    private final Clock clock;

    public NotificationLifecycleService(
            TripPlanService tripPlanService,
            ApplicationService applicationService,
            NotificationService notificationService,
            Clock clock) {
        this.tripPlanService = tripPlanService;
        this.applicationService = applicationService;
        this.notificationService = notificationService;
        this.clock = clock;
    }

    /** 行程进入 ONGOING 时，为发布者与已接受同行者各生成一条行程通知与一条安全提醒。 */
    @Transactional
    public void materializeOngoing(long tripId) {
        try {
            TripPlan trip = tripPlanService.require(tripId);
            Instant now = clock.instant();
            if (trip.status(now) != TripStatusEnum.ONGOING) {
                return;
            }
            List<DemoUser> participants = applicationService.participants(tripId);
            for (DemoUser participant : participants) {
                notificationService.notifyTripOngoing(participant.id(), tripId);
                notificationService.notifySystemSafetyReminder(participant.id(), tripId);
            }
        } catch (RuntimeException exception) {
            // 通知是副作用：行程详情不因通知失败而失败。
            log.warn("trip lifecycle notification skipped: trip={}", tripId, exception);
        }
    }
}