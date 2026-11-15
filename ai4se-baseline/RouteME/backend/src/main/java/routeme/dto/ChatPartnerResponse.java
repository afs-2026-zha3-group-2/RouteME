package routeme.dto;

import routeme.dao.ChatThread;
import routeme.model.DemoUser;
import routeme.model.TripPlan;

public record ChatPartnerResponse(
        TripSummaryResponse trip,
        DemoUserResponse other,
        ChatMessageResponse lastMessage,
        int messageCount) {

    public static ChatPartnerResponse from(
            ChatThread thread, TripPlan trip, DemoUser publisher, DemoUser other) {
        return new ChatPartnerResponse(
                TripSummaryResponse.from(trip, publisher),
                DemoUserResponse.from(other),
                thread.lastMessage() == null ? null : ChatMessageResponse.from(thread.lastMessage()),
                thread.messageCount());
    }
}