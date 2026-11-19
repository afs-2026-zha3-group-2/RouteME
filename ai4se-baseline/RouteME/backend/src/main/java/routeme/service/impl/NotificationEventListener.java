package routeme.service.impl;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import routeme.pojo.DemoUser;
import routeme.service.ApplicationService;
import routeme.service.CreditChangedEvent;
import routeme.service.NotificationService;
import routeme.service.TripRouteUpdatedEvent;

/**
 * 领域事件 → 通知。监听既有 {@link CreditChangedEvent} 与 {@link TripRouteUpdatedEvent}，
 * 不改账本与业务分支。
 */
@Service
public class NotificationEventListener {

    private final NotificationService notificationService;
    private final ApplicationService applicationService;

    public NotificationEventListener(
            NotificationService notificationService, ApplicationService applicationService) {
        this.notificationService = notificationService;
        this.applicationService = applicationService;
    }

    @EventListener
    public void onCreditChanged(CreditChangedEvent event) {
        notificationService.notifyCreditChanged(
                event.userId(),
                event.scoreBefore(),
                event.scoreAfter(),
                event.ledgerId(),
                event.reasonCode());
    }

    /** 路线变更：通知全体已接受同行者（发布者本人由写入侧跳过）。 */
    @EventListener
    @Transactional
    public void onTripRouteUpdated(TripRouteUpdatedEvent event) {
        for (DemoUser participant : applicationService.participants(event.tripId())) {
            notificationService.notifyTripRouteUpdated(
                    participant.id(), event.publisherId(), event.tripId(), event.updatedAt());
        }
    }
}