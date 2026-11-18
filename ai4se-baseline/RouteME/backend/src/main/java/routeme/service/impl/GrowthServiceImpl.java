package routeme.service.impl;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import routeme.constant.GrowthConstant;
import routeme.constant.TripTimeZoneConstant;
import routeme.entity.GrowthExpLedgerEntity;
import routeme.entity.UserGrowthAccountEntity;
import routeme.exception.InvalidInputException;
import routeme.mapper.GrowthExpLedgerMapper;
import routeme.mapper.UserGrowthAccountMapper;
import routeme.pojo.GrowthBooking;
import routeme.pojo.UserGrowth;
import routeme.service.GrowthService;

/**
 * 成长账户与经验流水的业务实现：经验唯一真相在账户表，账本只追加。
 * 方法契约以 {@link GrowthService} 为准。
 */
@Service
public class GrowthServiceImpl extends AbstractServiceImpl<GrowthExpLedgerMapper, GrowthExpLedgerEntity>
        implements GrowthService {

    private static final int MAX_ATTEMPTS = 3;

    private final UserGrowthAccountMapper accountMapper;
    private final Clock clock;

    public GrowthServiceImpl(UserGrowthAccountMapper accountMapper, Clock clock) {
        this.accountMapper = accountMapper;
        this.clock = clock;
    }

    @Override
    public UserGrowth read(long userId) {
        return ensureAccount(userId);
    }

    @Override
    @Transactional
    public List<UserGrowth> readAll(List<Long> userIds) {
        return userIds.stream().map(this::read).toList();
    }

    @Override
    @Transactional
    public UserGrowth book(GrowthBooking booking) {
        requireValid(booking);
        if (booking.idempotencyKey() != null && !booking.idempotencyKey().isBlank()
                && ledgerExists(booking.idempotencyKey())) {
            return ensureAccount(booking.userId());
        }

        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            UserGrowthAccountEntity account = requireAccount(booking.userId());
            int before = account.getExpTotal();
            int applied = appliedDelta(booking, before);
            int after = before + applied;
            GrowthExpLedgerEntity ledger = buildLedger(booking, before, applied, after);
            if (!insertLedger(ledger)) {
                // 幂等键已被并发请求写入：视为已结算，账户不再变化。
                return ensureAccount(booking.userId());
            }
            if (applied == 0) {
                return UserGrowth.of(booking.userId(), after);
            }
            if (updateAccount(booking.userId(), before, after)) {
                return UserGrowth.of(booking.userId(), after);
            }
            // 账户被并发改写：撤回本次暂写流水，重读后重算。
            baseMapper.deleteById(ledger.getId());
        }
        throw new IllegalStateException("could not settle growth for user " + booking.userId());
    }

    /**
     * 确保账户存在并返回当前状态；已存在时不改变经验，也不写流水。
     */
    @Transactional
    public UserGrowth ensureAccount(long userId) {
        UserGrowthAccountEntity existing = accountMapper.selectById(userId);
        if (existing != null) {
            return UserGrowth.of(userId, existing.getExpTotal());
        }
        String now = clock.instant().toString();
        UserGrowthAccountEntity entity = new UserGrowthAccountEntity();
        entity.setUserId(userId);
        entity.setExpTotal(0);
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        try {
            accountMapper.insert(entity);
        } catch (DataAccessException exception) {
            // SQLite 的唯一键冲突不映射为 DuplicateKeyException（SQLState 为空、错误码 19），
            // 因此按重读结果判定：并发请求已建好账户时直接采用它。
            UserGrowthAccountEntity concurrent = accountMapper.selectById(userId);
            if (concurrent == null) {
                throw exception;
            }
            return UserGrowth.of(userId, concurrent.getExpTotal());
        }
        return UserGrowth.of(userId, 0);
    }

    private void requireValid(GrowthBooking booking) {
        if (booking == null) {
            throw new InvalidInputException("growth booking is required");
        }
        if (booking.reasonCode() == null || booking.reasonCode().isBlank()) {
            throw new InvalidInputException("reason code is required");
        }
    }

    private UserGrowthAccountEntity requireAccount(long userId) {
        UserGrowthAccountEntity account = accountMapper.selectById(userId);
        if (account != null) {
            return account;
        }
        ensureAccount(userId);
        UserGrowthAccountEntity created = accountMapper.selectById(userId);
        if (created == null) {
            throw new IllegalStateException("growth account missing for user " + userId);
        }
        return created;
    }

    private int appliedDelta(GrowthBooking booking, int before) {
        if (booking.nominalDelta() <= 0) {
            return Math.max(booking.nominalDelta(), -before);
        }
        int remaining = Math.max(0, GrowthConstant.DAILY_POSITIVE_LIMIT - usedToday(booking.userId()));
        return Math.min(booking.nominalDelta(), remaining);
    }

    /**
     * 当日已实发的正向经验：按北京时间自然日，只统计实发为真的发布与获赞流水。
     */
    private int usedToday(long userId) {
        Instant dayStart = LocalDate.ofInstant(clock.instant(), TripTimeZoneConstant.ZONE)
                .atStartOfDay(TripTimeZoneConstant.ZONE)
                .toInstant();
        List<Object> totals = baseMapper.selectObjs(Wrappers.<GrowthExpLedgerEntity>query()
                .select("COALESCE(SUM(applied_delta), 0)")
                .eq("user_id", userId)
                .gt("applied_delta", 0)
                .in("reason_code", GrowthConstant.POSITIVE_REASONS)
                .ge("occurred_at", dayStart.toString()));
        if (totals.isEmpty() || !(totals.getFirst() instanceof Number total)) {
            return 0;
        }
        return total.intValue();
    }

    private GrowthExpLedgerEntity buildLedger(GrowthBooking booking, int before, int applied, int after) {
        GrowthExpLedgerEntity ledger = new GrowthExpLedgerEntity();
        ledger.setId(nextId(GrowthExpLedgerEntity::getId));
        ledger.setUserId(booking.userId());
        ledger.setReasonCode(booking.reasonCode());
        ledger.setAppliedDelta(applied);
        ledger.setExpBefore(before);
        ledger.setExpAfter(after);
        ledger.setRelatedType(booking.relatedType());
        ledger.setRelatedId(booking.relatedId());
        ledger.setIdempotencyKey(blankToNull(booking.idempotencyKey()));
        ledger.setOccurredAt(clock.instant().toString());
        return ledger;
    }

    /**
     * 追加流水；幂等键重复时返回 {@code false}，主键撞车时换 id 重试。
     */
    private boolean insertLedger(GrowthExpLedgerEntity ledger) {
        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            try {
                baseMapper.insert(ledger);
                return true;
            } catch (DataAccessException exception) {
                if (ledger.getIdempotencyKey() != null && ledgerExists(ledger.getIdempotencyKey())) {
                    return false;
                }
                if (baseMapper.selectById(ledger.getId()) == null) {
                    throw exception;
                }
                ledger.setId(ledger.getId() + 1);
            }
        }
        throw new IllegalStateException("could not append growth ledger");
    }

    private boolean updateAccount(long userId, int before, int after) {
        return accountMapper.update(null, Wrappers.<UserGrowthAccountEntity>lambdaUpdate()
                .eq(UserGrowthAccountEntity::getUserId, userId)
                .eq(UserGrowthAccountEntity::getExpTotal, before)
                .set(UserGrowthAccountEntity::getExpTotal, after)
                .set(UserGrowthAccountEntity::getUpdatedAt, clock.instant().toString())) > 0;
    }

    private boolean ledgerExists(String idempotencyKey) {
        return baseMapper.selectCount(Wrappers.<GrowthExpLedgerEntity>lambdaQuery()
                .eq(GrowthExpLedgerEntity::getIdempotencyKey, idempotencyKey)) > 0;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
