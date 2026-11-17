package routeme.service;

import routeme.entity.CreditRestrictionEntity;

/**
 * 信用限制守卫：写服务在执行业务前调用；读路径与举报 / 安全入口不调用。
 */
public interface CreditRestrictionGuard {

    /**
     * 当前用户是否受限：分数低于 60 或存在 active 限制记录。
     */
    boolean isRestricted(long userId);

    /**
     * 受限时抛 {@link routeme.exception.CreditRestrictedException}（403 CREDIT_RESTRICTED）。
     */
    void requireNotRestricted(long userId);

    /**
     * 当前 active 限制记录；没有则返回 null。
     */
    CreditRestrictionEntity activeRestriction(long userId);
}
