package routeme.service.impl;

import org.springframework.stereotype.Service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import routeme.entity.CreditRestrictionEntity;
import routeme.exception.CreditRestrictedException;
import routeme.mapper.CreditRestrictionMapper;
import routeme.model.CreditExitCalculator;
import routeme.service.CreditService;
import routeme.service.CreditRestrictionGuard;

/**
 * 只读守卫：服务端写入口的唯一信用限制判断。
 *
 * <p>只依赖 {@link CreditService} 与 {@link CreditRestrictionMapper}，因此可以被
 * 任意写服务注入而不产生与 {@code CreditEnforcementService} 的循环依赖。</p>
 */
@Service
public class CreditRestrictionGuardImpl implements CreditRestrictionGuard {

    private final CreditService creditService;
    private final CreditRestrictionMapper restrictionMapper;

    public CreditRestrictionGuardImpl(CreditService creditService, CreditRestrictionMapper restrictionMapper) {
        this.creditService = creditService;
        this.restrictionMapper = restrictionMapper;
    }

    @Override
    public boolean isRestricted(long userId) {
        if (creditService.read(userId).score() < CreditExitCalculator.RESTRICTION_THRESHOLD) {
            return true;
        }
        return activeRestriction(userId) != null;
    }

    @Override
    public void requireNotRestricted(long userId) {
        if (isRestricted(userId)) {
            throw new CreditRestrictedException(userId);
        }
    }

    @Override
    public CreditRestrictionEntity activeRestriction(long userId) {
        return restrictionMapper.selectOne(Wrappers.<CreditRestrictionEntity>lambdaQuery()
                .eq(CreditRestrictionEntity::getUserId, userId)
                .eq(CreditRestrictionEntity::getActiveFlag, 1)
                .last("LIMIT 1"));
    }
}
