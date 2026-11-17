package routeme.request;

/**
 * Registration payload. {@code email} is optional; role and status are never accepted from the
 * client (design D10 / A3).
 */
public record AuthRegisterRequest(
        String username,
        String password,
        String nickname,
        String email) {
}