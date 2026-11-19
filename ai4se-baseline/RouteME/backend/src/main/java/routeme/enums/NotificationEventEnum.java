package routeme.enums;

/**
 * 通知事件：类型下的具体业务事件。wire 值 snake_case，前端只做展示与测试断言。
 *
 * <p>每个事件同时给出所属 {@link NotificationTypeEnum}，避免调用方重复映射。</p>
 */
public enum NotificationEventEnum {
    TRIP_FULL(NotificationTypeEnum.TRIP, "trip_full"),
    TRIP_ROUTE_UPDATED(NotificationTypeEnum.TRIP, "trip_route_updated"),
    TRIP_GROUP_OPENED(NotificationTypeEnum.TRIP, "trip_group_opened"),
    TRIP_ONGOING(NotificationTypeEnum.TRIP, "trip_ongoing"),
    TRIP_CANCELLED(NotificationTypeEnum.TRIP, "trip_cancelled"),
    TRIP_COMPLETED(NotificationTypeEnum.TRIP, "trip_completed"),
    APPLICATION_RECEIVED(NotificationTypeEnum.APPLICATION, "application_received"),
    APPLICATION_ACCEPTED(NotificationTypeEnum.APPLICATION, "application_accepted"),
    APPLICATION_REJECTED(NotificationTypeEnum.APPLICATION, "application_rejected"),
    APPLICATION_CLOSED(NotificationTypeEnum.APPLICATION, "application_closed"),
    MESSAGE(NotificationTypeEnum.CHAT, "message"),
    GROUP_MESSAGE(NotificationTypeEnum.CHAT, "group_message"),
    CREDIT_CHANGED(NotificationTypeEnum.CREDIT, "credit_changed"),
    CREDIT_RECOVERED(NotificationTypeEnum.CREDIT, "credit_recovered"),
    REPORT_SUBMITTED(NotificationTypeEnum.REPORT, "report_submitted"),
    REPORT_PROCESSING(NotificationTypeEnum.REPORT, "report_processing"),
    REPORT_RESOLVED(NotificationTypeEnum.REPORT, "report_resolved"),
    ACCOUNT_SUSPENDED(NotificationTypeEnum.ACCOUNT, "account_suspended"),
    ACCOUNT_BANNED(NotificationTypeEnum.ACCOUNT, "account_banned"),
    ACCOUNT_RESTORED(NotificationTypeEnum.ACCOUNT, "account_restored"),
    SERVICE_JOINED(NotificationTypeEnum.SERVICE, "service_joined"),
    SERVICE_REPLY(NotificationTypeEnum.SERVICE, "service_reply"),
    SERVICE_CLOSED(NotificationTypeEnum.SERVICE, "service_closed"),
    SAFETY_REMINDER(NotificationTypeEnum.SYSTEM, "safety_reminder"),
    IDENTITY_VERIFIED(NotificationTypeEnum.SYSTEM, "identity_verified");

    private final NotificationTypeEnum type;
    private final String wireValue;

    NotificationEventEnum(NotificationTypeEnum type, String wireValue) {
        this.type = type;
        this.wireValue = wireValue;
    }

    public NotificationTypeEnum type() {
        return type;
    }

    public String wireValue() {
        return wireValue;
    }
}