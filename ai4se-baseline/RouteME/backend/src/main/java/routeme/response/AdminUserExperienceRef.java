package routeme.response;

/** 管理端用户详情里的体验引用，可跳转 {@code #/share/{trip_id}}。 */
public record AdminUserExperienceRef(
        long id,
        long tripId,
        String tripTitle,
        String createdAt) {
}