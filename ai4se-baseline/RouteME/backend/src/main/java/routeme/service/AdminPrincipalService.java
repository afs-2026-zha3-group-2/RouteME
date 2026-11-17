package routeme.service;

import org.springframework.stereotype.Service;

import routeme.enums.AccountRoleEnum;
import routeme.enums.AccountStatusEnum;
import routeme.exception.AccountBannedException;
import routeme.exception.AccountSuspendedException;
import routeme.exception.AdminRequiredException;
import routeme.exception.SessionInvalidException;
import routeme.pojo.DemoUser;

/**
 * Resolves the Bearer session and enforces {@code role=ADMIN} plus account status on every
 * administrative request (design D1 / §5.2). Role is read from the database per request.
 */
@Service
public class AdminPrincipalService {

    private static final String BEARER_PREFIX = "Bearer ";

    private final AuthService authService;
    private final AccountStatusService accountStatusService;

    public AdminPrincipalService(AuthService authService, AccountStatusService accountStatusService) {
        this.authService = authService;
        this.accountStatusService = accountStatusService;
    }

    public DemoUser requireAdmin(String authorization) {
        DemoUser user = authService.requireUser(bearerToken(authorization));
        if (!AccountRoleEnum.ADMIN.code().equals(user.role())) {
            throw new AdminRequiredException("administrator role required: " + user.id());
        }
        AccountStatusEnum status = accountStatusService.effectiveStatus(user.id());
        if (status == AccountStatusEnum.BANNED) {
            throw new AccountBannedException("administrator account is banned: " + user.id());
        }
        if (status == AccountStatusEnum.SUSPENDED) {
            throw new AccountSuspendedException("administrator account is suspended: " + user.id());
        }
        return user;
    }

    static String bearerToken(String authorization) {
        if (authorization == null
                || !authorization.regionMatches(true, 0, BEARER_PREFIX, 0, BEARER_PREFIX.length())) {
            throw new SessionInvalidException("missing Authorization: Bearer header");
        }
        String token = authorization.substring(BEARER_PREFIX.length()).trim();
        if (token.isEmpty()) {
            throw new SessionInvalidException("empty bearer token");
        }
        return token;
    }
}