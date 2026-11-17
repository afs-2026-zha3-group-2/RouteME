package routeme.service;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;

import routeme.config.FixedClockTestConfig;
import routeme.entity.UserEntity;
import routeme.enums.AccountStatusEnum;
import routeme.enums.BanReasonEnum;
import routeme.enums.WriteScopeEnum;
import routeme.exception.AccountBannedException;
import routeme.exception.AccountSuspendedException;
import routeme.exception.InvalidStatusTransitionException;

/**
 * State machine, lazy ban expiry and write guards (design D4 / D5). The fixed clock keeps the
 * expiry boundary deterministic.
 */
@SpringBootTest
@Import(FixedClockTestConfig.class)
@Transactional
class AccountStatusServiceTest {

    private static final long TARGET_USER = 4L;
    private static final long ADMIN_ID = 1000L;
    private static final Instant NOW = FixedClockTestConfig.NOW;
    private static final Instant FUTURE = NOW.plusSeconds(86_400);

    @Autowired
    private AccountStatusService accountStatusService;

    @Autowired
    private DemoUserService demoUserService;

    @Autowired
    private JdbcClient jdbcClient;

    @Test
    void in_activeUser_out_suspendRecordsOperatorAndTime() {
        // When
        accountStatusService.suspend(TARGET_USER, ADMIN_ID, "扰乱公共秩序", false);

        // Then
        UserEntity row = demoUserService.getById(TARGET_USER);
        assertAll(
                () -> assertEquals("SUSPENDED", row.getStatus(), "status"),
                () -> assertEquals("扰乱公共秩序", row.getStatusReason(), "reason"),
                () -> assertEquals(NOW.toString(), row.getStatusUpdatedAt(), "updated at"),
                () -> assertEquals(ADMIN_ID, row.getStatusUpdatedBy(), "operator"),
                () -> assertNull(row.getBanReasonCode(), "suspend does not set a ban reason"));
    }

    @Test
    void in_suspendedUser_out_endpointSuspendRejectedButReportRenewAllowed() {
        accountStatusService.suspend(TARGET_USER, ADMIN_ID, "first", false);

        assertThrows(
                InvalidStatusTransitionException.class,
                () -> accountStatusService.suspend(TARGET_USER, ADMIN_ID, "second", false),
                "endpoint cannot renew a suspension");

        accountStatusService.suspend(TARGET_USER, ADMIN_ID, "second", true);
        assertEquals("second", demoUserService.getById(TARGET_USER).getStatusReason(), "report can renew");
    }

    @Test
    void in_activeUser_out_banStoresReasonNoteAndExpiry() {
        // When
        accountStatusService.ban(
                TARGET_USER, ADMIN_ID, "发布虚假行程", BanReasonEnum.FAKE_TRIP, "多次伪造", FUTURE);

        // Then
        UserEntity row = demoUserService.getById(TARGET_USER);
        assertAll(
                () -> assertEquals("BANNED", row.getStatus(), "status"),
                () -> assertEquals("FAKE_TRIP", row.getBanReasonCode(), "ban reason"),
                () -> assertEquals("多次伪造", row.getBanReasonNote(), "ban note"),
                () -> assertEquals(FUTURE.toString(), row.getBanExpiresAt(), "ban expiry"),
                () -> assertEquals(ADMIN_ID, row.getStatusUpdatedBy(), "operator"));
    }

    @Test
    void in_bannedUser_out_banAgainRejected() {
        accountStatusService.ban(
                TARGET_USER, ADMIN_ID, "first", BanReasonEnum.HARASSMENT, null, FUTURE);

        assertThrows(
                InvalidStatusTransitionException.class,
                () -> accountStatusService.ban(
                        TARGET_USER, ADMIN_ID, "second", BanReasonEnum.HARASSMENT, null, FUTURE));
    }

    @Test
    void in_suspendedUser_out_restoreFallsBackToDefaultReason() {
        accountStatusService.suspend(TARGET_USER, ADMIN_ID, "temporary", false);

        accountStatusService.restore(TARGET_USER, ADMIN_ID, null);

        UserEntity row = demoUserService.getById(TARGET_USER);
        assertAll(
                () -> assertEquals("ACTIVE", row.getStatus(), "restored"),
                () -> assertEquals("管理员恢复账号", row.getStatusReason(), "fallback reason"),
                () -> assertNull(row.getBanExpiresAt(), "still no ban history"));
    }

    @Test
    void in_activeUser_out_restoreRejected() {
        assertThrows(
                InvalidStatusTransitionException.class,
                () -> accountStatusService.restore(TARGET_USER, ADMIN_ID, "nothing to restore"));
    }

    @Test
    void in_banWithExpiryEqualToNow_out_effectiveStatusIsActive() {
        storeStatus("BANNED", NOW, "HARASSMENT");

        assertEquals(AccountStatusEnum.ACTIVE, accountStatusService.effectiveStatus(TARGET_USER), "expired");
        assertEquals(
                "BANNED",
                jdbcClient.sql("SELECT status FROM app_users WHERE id = ?").param(TARGET_USER)
                        .query(String.class).single(),
                "read path does not persist");
    }

    @Test
    void in_banWithFutureExpiry_out_effectiveStatusIsBanned() {
        storeStatus("BANNED", FUTURE, "HARASSMENT");

        assertEquals(AccountStatusEnum.BANNED, accountStatusService.effectiveStatus(TARGET_USER));
    }

    @Test
    void in_expiredBan_out_refreshPersistsActiveAndKeepsHistory() {
        storeStatus("BANNED", NOW, "PRIVACY_LEAK");

        accountStatusService.refreshIfExpired(demoUserService.getById(TARGET_USER));

        String status = jdbcClient.sql("SELECT status FROM app_users WHERE id = ?").param(TARGET_USER)
                .query(String.class).single();
        String reason = jdbcClient.sql("SELECT ban_reason_code FROM app_users WHERE id = ?").param(TARGET_USER)
                .query(String.class).single();
        String expires = jdbcClient.sql("SELECT ban_expires_at FROM app_users WHERE id = ?").param(TARGET_USER)
                .query(String.class).single();
        assertAll(
                () -> assertEquals("ACTIVE", status, "expiry converges to ACTIVE"),
                () -> assertEquals("PRIVACY_LEAK", reason, "ban reason kept as history"),
                () -> assertEquals(NOW.toString(), expires, "expiry kept as history"));
    }

    @Test
    void in_suspendedUser_out_onlyBusinessWritesBlocked() {
        accountStatusService.suspend(TARGET_USER, ADMIN_ID, "temporary", false);

        assertThrows(
                AccountSuspendedException.class,
                () -> accountStatusService.assertCanWrite(TARGET_USER, WriteScopeEnum.BUSINESS));
        assertDoesNotThrow(() -> accountStatusService.assertCanWrite(TARGET_USER, WriteScopeEnum.REPORT));
        assertDoesNotThrow(() -> accountStatusService.assertCanWrite(TARGET_USER, WriteScopeEnum.SUPPORT));
    }

    @Test
    void in_bannedUser_out_everyWriteBlocked() {
        accountStatusService.ban(
                TARGET_USER, ADMIN_ID, "severe", BanReasonEnum.ILLEGAL_CONTENT, null, FUTURE);

        for (WriteScopeEnum scope : WriteScopeEnum.values()) {
            assertThrows(
                    AccountBannedException.class,
                    () -> accountStatusService.assertCanWrite(TARGET_USER, scope),
                    scope.name());
        }
    }

    @Test
    void in_expiredBan_out_writeAllowedAndStatusConverged() {
        storeStatus("BANNED", NOW, "HARASSMENT");

        assertDoesNotThrow(() -> accountStatusService.assertCanWrite(TARGET_USER, WriteScopeEnum.BUSINESS));
        assertEquals(
                "ACTIVE",
                jdbcClient.sql("SELECT status FROM app_users WHERE id = ?").param(TARGET_USER)
                        .query(String.class).single(),
                "guard write persists the lazy expiry");
    }

    @Test
    void in_bannedUser_out_updateBanChangesReasonAndExpiry() {
        accountStatusService.ban(
                TARGET_USER, ADMIN_ID, "first", BanReasonEnum.FRAUD_RISK, null, FUTURE);

        accountStatusService.updateBan(
                TARGET_USER, ADMIN_ID, "extended", BanReasonEnum.ILLEGAL_CONTENT, null, FUTURE.plusSeconds(60));

        UserEntity row = demoUserService.getById(TARGET_USER);
        assertEquals("extended", row.getStatusReason());
        assertEquals(FUTURE.plusSeconds(60).toString(), row.getBanExpiresAt());
    }

    @Test
    void in_activeUser_out_updateBanRejected() {
        assertThrows(
                InvalidStatusTransitionException.class,
                () -> accountStatusService.updateBan(
                        TARGET_USER, ADMIN_ID, "nothing", BanReasonEnum.HARASSMENT, null, FUTURE));
    }

    private void storeStatus(String status, Instant expiresAt, String reasonCode) {
        UserEntity entity = demoUserService.getById(TARGET_USER);
        entity.setStatus(status);
        entity.setBanExpiresAt(expiresAt.toString());
        entity.setBanReasonCode(reasonCode);
        demoUserService.updateById(entity);
    }
}