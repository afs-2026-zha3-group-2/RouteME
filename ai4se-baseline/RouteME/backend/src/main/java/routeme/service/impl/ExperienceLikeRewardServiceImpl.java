package routeme.service.impl;

import java.time.Clock;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import routeme.constant.ExperienceLikeConstant;
import routeme.entity.CreditLedgerEntity;
import routeme.mapper.CreditLedgerMapper;
import routeme.mapper.ExperienceLikeMapper;
import routeme.model.ExperienceLikeRewardRules;
import routeme.pojo.CreditBooking;
import routeme.service.CreditService;
import routeme.service.ExperienceLikeRewardService;

/**
 * 体验获赞的结算实现：档位取单篇最大赞数，已锁定档位不重复结算，月度额度按
 * 北京时间月首重置、截断不结转。方法契约以 {@link ExperienceLikeRewardService} 为准。
 */
@Service
public class ExperienceLikeRewardServiceImpl implements ExperienceLikeRewardService {

    private final ExperienceLikeMapper likeMapper;
    private final CreditLedgerMapper ledgerMapper;
    private final CreditService creditService;
    private final Clock clock;

    public ExperienceLikeRewardServiceImpl(
            ExperienceLikeMapper likeMapper,
            CreditLedgerMapper ledgerMapper,
            CreditService creditService,
            Clock clock) {
        this.likeMapper = likeMapper;
        this.ledgerMapper = ledgerMapper;
        this.creditService = creditService;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void award(long tripId, long authorId) {
        int maxLikes = ExperienceLikeRewardRules.maxLikes(
                likeMapper.selectLikeCountsOfTripAuthor(tripId, authorId));
        List<Integer> reached = ExperienceLikeRewardRules.reachedTiers(maxLikes);
        if (reached.isEmpty()) {
            return;
        }
        Set<Integer> locked = lockedTiers(tripId, authorId);
        for (int tier : reached) {
            if (locked.contains(tier)) {
                continue;
            }
            int delta = ExperienceLikeRewardRules.monthlyDelta(monthlyUsed(authorId));
            creditService.book(new CreditBooking(
                    authorId,
                    ExperienceLikeConstant.REASON_CODE,
                    delta,
                    ExperienceLikeConstant.RELATED_TYPE,
                    String.valueOf(tripId),
                    ExperienceLikeConstant.idempotencyKey(tripId, authorId, tier)));
        }
    }

    /**
     * 已锁定档位：账本里出现过该（行程, 作者, 档位）的幂等键，含实发 0 的截断行。
     */
    private Set<Integer> lockedTiers(long tripId, long authorId) {
        String prefix = ExperienceLikeConstant.idempotencyPrefix(tripId, authorId);
        Set<Integer> locked = new HashSet<>();
        for (CreditLedgerEntity row : ledgerMapper.selectList(Wrappers.<CreditLedgerEntity>lambdaQuery()
                .eq(CreditLedgerEntity::getUserId, authorId)
                .eq(CreditLedgerEntity::getReasonCode, ExperienceLikeConstant.REASON_CODE)
                .likeRight(CreditLedgerEntity::getIdempotencyKey, prefix))) {
            String key = row.getIdempotencyKey();
            if (key == null) {
                continue;
            }
            try {
                locked.add(Integer.parseInt(key.substring(prefix.length())));
            } catch (NumberFormatException exception) {
                // 前缀相同但档位段不是数字的键不参与锁定。
            }
        }
        return locked;
    }

    /**
     * 本月已实发额度：按 applied_delta 求和，北京时间月首为界，截断不结转。
     */
    private int monthlyUsed(long authorId) {
        Instant now = clock.instant();
        Instant start = ExperienceLikeRewardRules.monthStart(now);
        Instant end = ExperienceLikeRewardRules.monthEnd(now);
        return ledgerMapper.selectList(Wrappers.<CreditLedgerEntity>lambdaQuery()
                        .eq(CreditLedgerEntity::getUserId, authorId)
                        .eq(CreditLedgerEntity::getReasonCode, ExperienceLikeConstant.REASON_CODE)).stream()
                .filter(row -> row.getOccurredAt() != null)
                .filter(row -> ExperienceLikeRewardRules.withinMonth(
                        Instant.parse(row.getOccurredAt()), start, end))
                .mapToInt(CreditLedgerEntity::getAppliedDelta)
                .sum();
    }
}
