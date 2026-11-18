package routeme.service;

import java.time.Clock;
import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import routeme.entity.UserEntity;
import routeme.enums.AccountStatusEnum;
import routeme.enums.BanReasonEnum;
import routeme.enums.WriteScopeEnum;
import routeme.exception.AccountBannedException;
import routeme.exception.AccountSuspendedException;
import routeme.exception.InvalidStatusTransitionException;
import routeme.exception.UserNotFoundException;

/**
 * Single source of truth for account status transitions, lazy ban expiry and write guards
 * (design D4 / D5).
 */
@Service
public class AccountStatusService {

    private static final String RESTORE_REASON_FALLBACK = "管理员恢复账号";

    private final DemoUserService demoUserService;
    private final Clock clock;

    public AccountStatusService(DemoUserService demoUserService, Clock clock) {
        this.demoUserService = demoUserService;
        this.clock = clock;
    }

    public UserEntity requireEntity(long userId) {
        UserEntity entity = demoUserService.getById(userId);
        if (entity == null) {
            throw new UserNotFoundException(userId);
        }
        return entity;
    }

    /** Reads the effective status without writing to the database. */
    public AccountStatusEnum effectiveStatus(long userId) {
        return effectiveStatus(requireEntity(userId));
    }

    public AccountStatusEnum effectiveStatus(UserEntity entity) {
        AccountStatusEnum stored = AccountStatusEnum.of(entity.getStatus());
        if (stored == AccountStatusEnum.BANNED && isBanExpired(entity)) {
            return AccountStatusEnum.ACTIVE;
        }
        return stored;
    }

    /** Writes the lazy expiry inside a write transaction; ban history columns stay untouched. */
    @Transactional
    public UserEntity refreshIfExpired(UserEntity entity) {
        if (AccountStatusEnum.BANNED.code().equals(entity.getStatus()) && isBanExpired(entity)) {
            entity.setStatus(AccountStatusEnum.ACTIVE.code());
            demoUserService.updateById(entity);
        }
        return entity;
    }

    /**
     * Rejects writes from restricted accounts. A still-active ban that has expired is persisted as
     * ACTIVE first, so the write is allowed and the database converges.
     */
    @Transactional
    public void assertCanWrite(long userId, WriteScopeEnum scope) {
        UserEntity entity = refreshIfExpired(requireEntity(userId));
        AccountStatusEnum status = AccountStatusEnum.of(entity.getStatus());
        if (status == AccountStatusEnum.BANNED) {
            throw new AccountBannedException("account is banned: " + userId);
        }
        if (status == AccountStatusEnum.SUSPENDED && scope == WriteScopeEnum.BUSINESS) {
            throw new AccountSuspendedException("account is suspended: " + userId);
        }
    }

    /** Administrative suspend. Reports may renew an existing suspension; the endpoint may not. */
    @Transactional
    public UserEntity suspend(long userId, long adminId, String reason, boolean allowRenew) {
        UserEntity entity = refreshIfExpired(requireEntity(userId));
        AccountStatusEnum current = AccountStatusEnum.of(entity.getStatus());
        if (current == AccountStatusEnum.SUSPENDED && allowRenew) {
            return record(entity, AccountStatusEnum.SUSPENDED, adminId, reason, null, null, null);
        }
        if (current != AccountStatusEnum.ACTIVE) {
            throw new InvalidStatusTransitionException(
                    "cannot suspend " + userId + " from " + current.code());
        }
        return record(entity, AccountStatusEnum.SUSPENDED, adminId, reason, null, null, null);
    }

    /** Administrative ban; banning an already banned account updates its reason / note / expiry. */
    @Transactional
    public UserEntity ban(
            long userId,
            long adminId,
            String reason,
            BanReasonEnum banReason,
            String banReasonNote,
            Instant expiresAt) {
        UserEntity entity = refreshIfExpired(requireEntity(userId));
        return record(entity, AccountStatusEnum.BANNED, adminId, reason, banReason, banReasonNote, expiresAt);
    }

    @Transactional
    public UserEntity restore(long userId, long adminId, String reason) {
        UserEntity entity = refreshIfExpired(requireEntity(userId));
        AccountStatusEnum current = AccountStatusEnum.of(entity.getStatus());
        if (current != AccountStatusEnum.SUSPENDED && current != AccountStatusEnum.BANNED) {
            throw new InvalidStatusTransitionException("cannot restore " + userId + " from " + current.code());
        }
        String recordedReason = reason == null || reason.isBlank() ? RESTORE_REASON_FALLBACK : reason.trim();
        return record(entity, AccountStatusEnum.ACTIVE, adminId, recordedReason, null, null, null);
    }

    /** Report resolution: only updates ban metadata and requires an already banned account. */
    @Transactional
    public UserEntity updateBan(
            long userId,
            long adminId,
            String reason,
            BanReasonEnum banReason,
            String banReasonNote,
            Instant expiresAt) {
        UserEntity entity = refreshIfExpired(requireEntity(userId));
        if (!AccountStatusEnum.BANNED.code().equals(entity.getStatus())) {
            throw new InvalidStatusTransitionException("cannot update ban of " + userId + " from " + entity.getStatus());
        }
        return record(entity, AccountStatusEnum.BANNED, adminId, reason, banReason, banReasonNote, expiresAt);
    }

    private UserEntity record(
            UserEntity entity,
            AccountStatusEnum status,
            long adminId,
            String reason,
            BanReasonEnum banReason,
            String banReasonNote,
            Instant expiresAt) {
        entity.setStatus(status.code());
        entity.setStatusReason(reason);
        entity.setStatusUpdatedAt(clock.instant().toString());
        entity.setStatusUpdatedBy(adminId);
        if (status == AccountStatusEnum.BANNED) {
            entity.setBanReasonCode(banReason == null ? null : banReason.code());
            entity.setBanReasonNote(banReasonNote);
            entity.setBanExpiresAt(expiresAt == null ? null : expiresAt.toString());
        }
        // Otherwise ban_reason_code / ban_reason_note / ban_expires_at stay as history (design D4).
        demoUserService.updateById(entity);
        return entity;
    }

    private boolean isBanExpired(UserEntity entity) {
        String raw = entity.getBanExpiresAt();
        if (raw == null || raw.isBlank()) {
            return false;
        }
        return !Instant.parse(raw).isAfter(clock.instant());
    }
}