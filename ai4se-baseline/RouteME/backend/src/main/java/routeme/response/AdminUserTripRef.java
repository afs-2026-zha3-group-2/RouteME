package routeme.response;

/** 管理端用户详情里的行程引用，可直接跳转 {@code #/trips/{id}}。 */
public record AdminUserTripRef(
        long id,
        String title,
        String status,
        String startDate) {
}