package routeme.service.impl;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import routeme.entity.UserWalletEntity;
import routeme.entity.WalletLedgerEntity;
import routeme.enums.WalletDirectionEnum;
import routeme.enums.WalletEntryTypeEnum;
import routeme.exception.InsufficientBalanceException;
import routeme.exception.InvalidInputException;
import routeme.mapper.UserWalletMapper;
import routeme.mapper.WalletLedgerMapper;
import routeme.pojo.UserWallet;
import routeme.pojo.WalletLedgerEntry;
import routeme.pojo.WalletPosting;
import routeme.service.WalletService;

/**
 * 钱包与流水的业务实现（design D2）：
 * 条件更新 {@code WHERE balance_cents = 变更前} 防止双花，流水与余额在同一事务内写入；
 * 条件更新 0 行时重读并重试，流水 id 并发碰撞时重算 id 重试。
 */
@Service
public class WalletServiceImpl extends AbstractServiceImpl<WalletLedgerMapper, WalletLedgerEntity>
        implements WalletService {

    private static final int MAX_BALANCE_RETRIES = 5;
    private static final int MAX_LEDGER_ID_RETRIES = 3;

    private final UserWalletMapper walletMapper;
    private final Clock clock;

    public WalletServiceImpl(UserWalletMapper walletMapper, Clock clock) {
        this.walletMapper = walletMapper;
        this.clock = clock;
    }

    @Override
    @Transactional
    public UserWallet read(long userId) {
        return ensureWallet(userId);
    }

    @Override
    @Transactional
    public UserWallet ensureWallet(long userId) {
        UserWalletEntity existing = walletMapper.selectById(userId);
        if (existing != null) {
            return toWallet(existing);
        }
        String now = clock.instant().toString();
        UserWalletEntity entity = new UserWalletEntity();
        entity.setUserId(userId);
        entity.setBalanceCents(UserWallet.INITIAL_BALANCE_CENTS);
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        try {
            walletMapper.insert(entity);
        } catch (DuplicateKeyException exception) {
            // 并发首次读取：另一个事务已建好钱包，直接读当前值。
            UserWalletEntity concurrent = walletMapper.selectById(userId);
            if (concurrent == null) {
                throw exception;
            }
            return toWallet(concurrent);
        }
        return toWallet(entity);
    }

    @Override
    @Transactional
    public WalletPosting debit(
            long userId, int amountCents, WalletEntryTypeEnum entryType, String relatedType, String relatedId) {
        return post(userId, amountCents, WalletDirectionEnum.DEBIT, entryType, relatedType, relatedId);
    }

    @Override
    @Transactional
    public WalletPosting credit(
            long userId, int amountCents, WalletEntryTypeEnum entryType, String relatedType, String relatedId) {
        return post(userId, amountCents, WalletDirectionEnum.CREDIT, entryType, relatedType, relatedId);
    }

    @Override
    public List<WalletLedgerEntry> ledgerOf(long userId) {
        return baseMapper
                .selectList(Wrappers.<WalletLedgerEntity>lambdaQuery()
                        .eq(WalletLedgerEntity::getUserId, userId)
                        .orderByAsc(WalletLedgerEntity::getOccurredAt)
                        .orderByAsc(WalletLedgerEntity::getId))
                .stream()
                .map(WalletServiceImpl::toEntry)
                .toList();
    }

    private WalletPosting post(
            long userId,
            int amountCents,
            WalletDirectionEnum direction,
            WalletEntryTypeEnum entryType,
            String relatedType,
            String relatedId) {
        if (amountCents <= 0) {
            throw new InvalidInputException("amount must be positive");
        }
        if (entryType == null) {
            throw new InvalidInputException("entry type is required");
        }
        if (relatedType == null || relatedType.isBlank() || relatedId == null || relatedId.isBlank()) {
            throw new InvalidInputException("related business is required");
        }
        for (int attempt = 0; attempt < MAX_BALANCE_RETRIES; attempt++) {
            UserWalletEntity wallet = requireWallet(userId);
            int before = wallet.getBalanceCents();
            if (direction == WalletDirectionEnum.DEBIT && before < amountCents) {
                throw new InsufficientBalanceException(userId, amountCents, before);
            }
            int after = direction == WalletDirectionEnum.CREDIT ? before + amountCents : before - amountCents;
            Instant now = clock.instant();
            int updated = walletMapper.updateBalanceIfUnchanged(userId, before, after, now.toString());
            if (updated == 0) {
                // 并发写入改变了余额：重读后重新计算。
                continue;
            }
            WalletLedgerEntry entry = appendLedger(
                    userId, direction, amountCents, before, after, entryType, relatedType, relatedId, now);
            return new WalletPosting(new UserWallet(userId, after), entry);
        }
        throw new IllegalStateException("wallet balance retries exhausted for user " + userId);
    }

    private WalletLedgerEntry appendLedger(
            long userId,
            WalletDirectionEnum direction,
            int amountCents,
            int before,
            int after,
            WalletEntryTypeEnum entryType,
            String relatedType,
            String relatedId,
            Instant occurredAt) {
        DuplicateKeyException lastCollision = null;
        for (int attempt = 0; attempt < MAX_LEDGER_ID_RETRIES; attempt++) {
            WalletLedgerEntity entity = new WalletLedgerEntity();
            entity.setId(nextId(WalletLedgerEntity::getId));
            entity.setUserId(userId);
            entity.setDirection(direction.name());
            entity.setAmountCents(amountCents);
            entity.setBalanceBeforeCents(before);
            entity.setBalanceAfterCents(after);
            entity.setEntryType(entryType.name());
            entity.setRelatedType(relatedType);
            entity.setRelatedId(relatedId);
            entity.setOccurredAt(occurredAt.toString());
            try {
                baseMapper.insert(entity);
                return toEntry(entity);
            } catch (DuplicateKeyException exception) {
                // 流水只可能因 id 并发碰撞失败：重算 id 再试。
                lastCollision = exception;
            }
        }
        throw lastCollision;
    }

    private UserWalletEntity requireWallet(long userId) {
        UserWalletEntity wallet = walletMapper.selectById(userId);
        if (wallet != null) {
            return wallet;
        }
        ensureWallet(userId);
        UserWalletEntity created = walletMapper.selectById(userId);
        if (created == null) {
            throw new IllegalStateException("wallet missing for user " + userId);
        }
        return created;
    }

    private static UserWallet toWallet(UserWalletEntity entity) {
        return new UserWallet(entity.getUserId(), entity.getBalanceCents());
    }

    private static WalletLedgerEntry toEntry(WalletLedgerEntity entity) {
        return new WalletLedgerEntry(
                entity.getId(),
                entity.getUserId(),
                WalletDirectionEnum.ofCode(entity.getDirection()),
                entity.getAmountCents(),
                entity.getBalanceBeforeCents(),
                entity.getBalanceAfterCents(),
                WalletEntryTypeEnum.ofCode(entity.getEntryType()),
                entity.getRelatedType(),
                entity.getRelatedId(),
                Instant.parse(entity.getOccurredAt()));
    }
}