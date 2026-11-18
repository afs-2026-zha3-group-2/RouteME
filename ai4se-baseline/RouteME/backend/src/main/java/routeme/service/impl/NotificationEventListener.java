package routeme.service.impl;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import routeme.service.CreditChangedEvent;
import routeme.service.NotificationService;

/**
 * 信用变化 → 信用通知。监听既有 {@link CreditChangedEvent}，不改账本与业务分支。
 */
@Service
public class NotificationEventListener {

    private final NotificationService notificationService;

    public NotificationEventListener(NotificationService notificationService) {
        this.notificationService = notificationService;
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
}