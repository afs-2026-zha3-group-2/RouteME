package routeme.response;

import java.time.Instant;

import routeme.pojo.ChatThread;
import routeme.pojo.DemoUser;
import routeme.pojo.TripPlan;

public record ChatPartnerResponse(
        TripSummaryResponse trip,
        DemoUserResponse other,
        ChatMessageResponse lastMessage,
        int messageCount) {

    public static ChatPartnerResponse from(
            ChatThread thread, TripPlan trip, DemoUser publisher, DemoUser other, Instant now) {
        return new ChatPartnerResponse(
                TripSummaryResponse.from(trip, publisher, now),
                DemoUserResponse.from(other),
                thread.lastMessage() == null ? null : ChatMessageResponse.from(thread.lastMessage()),
                thread.messageCount());
    }
}