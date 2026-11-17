package routeme.service.impl;

import java.time.Clock;
import java.util.List;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import routeme.entity.CreditLedgerEntity;
import routeme.entity.UserCreditAccountEntity;
import routeme.exception.InvalidInputException;
import routeme.mapper.CreditLedgerMapper;
import routeme.mapper.UserCreditAccountMapper;
import routeme.pojo.CreditBooking;
import routeme.pojo.UserCredit;
import routeme.service.CreditChangedEvent;
import routeme.service.CreditService;

/**
 * 信用账户与账本的业务实现：分数唯一真相在账户表，账本只追加。
 * 方法契约以 {@link CreditService} 为准。
 */
@Service
public class CreditServiceImpl extends AbstractServiceImpl<CreditLedgerMapper, CreditLedgerEntity>
        implements CreditService {

    private final UserCreditAccountMapper accountMapper;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    public CreditServiceImpl(
            UserCreditAccountMapper accountMapper, ApplicationEventPublisher events, Clock clock) {
        this.accountMapper = accountMapper;
        this.events = events;
        this.clock = clock;
    }

    @Override
    public UserCredit read(long userId) {
        return ensureAccount(userId);
    }

    @Override
    @Transactional
    public List<UserCredit> readAll(List<Long> userIds) {
        return userIds.stream().map(this::read).toList();
    }

    @Override
    @Transactional
    public UserCredit ensureAccount(long userId) {
        UserCreditAccountEntity existing = accountMapper.selectById(userId);
        if (existing != null) {
            return toCredit(existing);
        }
        String now = clock.instant().toString();
        UserCreditAccountEntity entity = new UserCreditAccountEntity();
        entity.setUserId(userId);
        entity.setScore(UserCredit.INITIAL_SCORE);
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        try {
            accountMapper.insert(entity);
        } catch (DuplicateKeyException exception) {
            // 并发首次读取：另一个事务已建好账户，直接读当前值。
            UserCreditAccountEntity concurrent = accountMapper.selectById(userId);
            if (concurrent == null) {
                throw exception;
            }
            return toCredit(concurrent);
        }
        return toCredit(entity);
    }

    @Override
    @Transactional
    public UserCredit book(CreditBooking booking) {
        if (booking == null) {
            throw new InvalidInputException("credit booking is required");
        }
        if (booking.reasonCode() == null || booking.reasonCode().isBlank()) {
            throw new InvalidInputException("reason code is required");
        }
        UserCreditAccountEntity account = requireAccount(booking.userId());
        if (booking.idempotencyKey() != null && !booking.idempotencyKey().isBlank()
                && ledgerExists(booking.idempotencyKey())) {
            return toCredit(account);
        }

        int before = account.getScore();
        int after = clamp(before + booking.delta());
        int applied = after - before;

        CreditLedgerEntity ledger = new CreditLedgerEntity();
        ledger.setId(nextId(CreditLedgerEntity::getId));
        ledger.setUserId(booking.userId());
        ledger.setReasonCode(booking.reasonCode());
        ledger.setAppliedDelta(applied);
        ledger.setScoreBefore(before);
        ledger.setScoreAfter(after);
        ledger.setRelatedType(booking.relatedType());
        ledger.setRelatedId(booking.relatedId());
        ledger.setIdempotencyKey(blankToNull(booking.idempotencyKey()));
        ledger.setOccurredAt(clock.instant().toString());
        try {
            baseMapper.insert(ledger);
        } catch (DuplicateKeyException exception) {
            // 同一业务事件并发提交：唯一索引兜底，分数不再变化。
            return toCredit(requireAccount(booking.userId()));
        }

        if (applied != 0) {
            account.setScore(after);
            account.setUpdatedAt(clock.instant().toString());
            accountMapper.updateById(account);
            events.publishEvent(new CreditChangedEvent(
                    booking.userId(), before, after, ledger.getId(), booking.reasonCode(), clock.instant()));
        }
        return UserCredit.of(booking.userId(), after);
    }

    private UserCreditAccountEntity requireAccount(long userId) {
        UserCreditAccountEntity account = accountMapper.selectById(userId);
        if (account != null) {
            return account;
        }
        ensureAccount(userId);
        UserCreditAccountEntity created = accountMapper.selectById(userId);
        if (created == null) {
            throw new IllegalStateException("credit account missing for user " + userId);
        }
        return created;
    }

    private boolean ledgerExists(String idempotencyKey) {
        CreditLedgerEntity existing = baseMapper.selectOne(Wrappers.<CreditLedgerEntity>lambdaQuery()
                .eq(CreditLedgerEntity::getIdempotencyKey, idempotencyKey));
        return existing != null;
    }

    private static int clamp(int score) {
        return Math.max(UserCredit.MIN_SCORE, Math.min(UserCredit.MAX_SCORE, score));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private static UserCredit toCredit(UserCreditAccountEntity entity) {
        return UserCredit.of(entity.getUserId(), entity.getScore());
    }
}
