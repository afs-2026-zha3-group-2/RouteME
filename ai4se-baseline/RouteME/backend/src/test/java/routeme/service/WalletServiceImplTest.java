package routeme.service;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;

import com.baomidou.mybatisplus.core.toolkit.support.SFunction;

import routeme.entity.UserWalletEntity;
import routeme.entity.WalletLedgerEntity;
import routeme.enums.WalletEntryTypeEnum;
import routeme.exception.InsufficientBalanceException;
import routeme.mapper.UserWalletMapper;
import routeme.mapper.WalletLedgerMapper;
import routeme.pojo.WalletPosting;
import routeme.service.impl.WalletServiceImpl;

/**
 * 钱包服务的并发分支：条件更新 0 行重读重试、余额不足拒绝、流水 id 碰撞重算 id。
 * 这三条分支无法用单线程 API 测试稳定复现，因此用 mock mapper 断言调用序列。
 */
@ExtendWith(MockitoExtension.class)
class WalletServiceImplTest {

    private static final long USER = 1L;
    private static final Instant NOW = Instant.parse("2026-11-16T09:00:00Z");

    @Mock
    private UserWalletMapper walletMapper;

    @Mock
    private WalletLedgerMapper ledgerMapper;

    @Test
    void in_casZeroRows_out_reReadsAndPostsOnce() {
        // Given：第一次读到 1,000,000，但条件更新被别人抢先（0 行）；重读后为 999,000。
        when(walletMapper.selectById(USER)).thenReturn(wallet(1_000_000), wallet(999_000));
        when(walletMapper.updateBalanceIfUnchanged(eq(USER), eq(1_000_000), anyInt(), anyString()))
                .thenReturn(0);
        when(walletMapper.updateBalanceIfUnchanged(eq(USER), eq(999_000), anyInt(), anyString()))
                .thenReturn(1);
        when(ledgerMapper.insert(any(WalletLedgerEntity.class))).thenReturn(1);

        // When
        WalletPosting posting = service().debit(USER, 50_000, WalletEntryTypeEnum.LOAN_REPAYMENT,
                "travel_loan", "11");

        // Then：最终按重读余额计算，流水只写一条。
        assertAll(
                () -> assertEquals(949_000, posting.wallet().balanceCents(), "retry uses the refreshed balance"),
                () -> assertEquals(949_000, posting.entry().balanceAfterCents(), "entry follows the retry"),
                () -> assertEquals(999_000, posting.entry().balanceBeforeCents(), "before is the refreshed balance"),
                () -> verify(walletMapper, times(2)).updateBalanceIfUnchanged(anyLong(), anyInt(), anyInt(), anyString()),
                () -> verify(ledgerMapper, times(1)).insert(any(WalletLedgerEntity.class)));
    }

    @Test
    void in_insufficientBalance_out_conflictAndNoWrite() {
        // Given：余额 49,999 分，还款 50,000 分。
        when(walletMapper.selectById(USER)).thenReturn(wallet(49_999));

        // When
        InsufficientBalanceException exception = assertThrows(
                InsufficientBalanceException.class,
                () -> service().debit(USER, 50_000, WalletEntryTypeEnum.LOAN_REPAYMENT,
                        "travel_loan", "11"));

        // Then
        assertAll(
                () -> assertEquals("INSUFFICIENT_BALANCE", exception.code(), "contract error code"),
                () -> assertEquals(HttpStatus.CONFLICT, exception.status(), "409 conflict"),
                () -> verify(walletMapper, never())
                        .updateBalanceIfUnchanged(anyLong(), anyInt(), anyInt(), anyString()),
                () -> verify(ledgerMapper, never()).insert(any(WalletLedgerEntity.class)));
    }

    @Test
    void in_ledgerIdCollision_out_retriesWithNewId() {
        // Given：余额条件更新成功，但流水 id 连续两次与并发请求碰撞。
        when(walletMapper.selectById(USER)).thenReturn(wallet(1_000_000));
        when(walletMapper.updateBalanceIfUnchanged(eq(USER), eq(1_000_000), eq(1_000_950), anyString()))
                .thenReturn(1);
        when(ledgerMapper.insert(any(WalletLedgerEntity.class)))
                .thenThrow(new DuplicateKeyException("id collision"))
                .thenThrow(new DuplicateKeyException("id collision"))
                .thenReturn(1);

        // When
        WalletPosting posting = service().credit(USER, 950, WalletEntryTypeEnum.LOAN_DISBURSEMENT,
                "travel_loan", "7");

        // Then
        ArgumentCaptor<WalletLedgerEntity> captor = ArgumentCaptor.forClass(WalletLedgerEntity.class);
        assertAll(
                () -> assertEquals(1_000_950, posting.wallet().balanceCents(), "credit adds to the balance"),
                () -> assertEquals(3L, posting.entry().id(), "third id wins after two collisions"),
                () -> verify(ledgerMapper, times(3)).insert(captor.capture()),
                () -> assertEquals(3L, captor.getValue().getId(), "the retried row uses the recomputed id"));
    }

    private WalletServiceImpl service() {
        TestableWalletService service = new TestableWalletService(walletMapper, ledgerMapper);
        return service;
    }

    private static UserWalletEntity wallet(int balanceCents) {
        UserWalletEntity entity = new UserWalletEntity();
        entity.setUserId(USER);
        entity.setBalanceCents(balanceCents);
        entity.setCreatedAt(NOW.toString());
        entity.setUpdatedAt(NOW.toString());
        return entity;
    }

    /**
     * 注入 mock 的流水 mapper，并让 nextId 从 1 递增（避免依赖真实分页查询）。
     */
    private static final class TestableWalletService extends WalletServiceImpl {

        private final AtomicLong ids = new AtomicLong();

        private TestableWalletService(UserWalletMapper walletMapper, WalletLedgerMapper ledgerMapper) {
            super(walletMapper, Clock.fixed(NOW, ZoneOffset.UTC));
            this.baseMapper = ledgerMapper;
        }

        @Override
        protected long nextId(SFunction<WalletLedgerEntity, Long> idColumn) {
            return ids.incrementAndGet();
        }
    }
}