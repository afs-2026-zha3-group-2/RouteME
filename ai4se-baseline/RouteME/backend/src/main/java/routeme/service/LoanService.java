package routeme.service;

import java.util.List;

import routeme.pojo.TravelLoan;
import routeme.request.LoanCreateRequest;

/**
 * 借款与还款的业务契约（design D5 / D6）：
 * 发放时按本金 5% 扣除服务费、净额入账；每个用户同一时刻最多一笔 {@code ACTIVE}；
 * 还款全额扣本金并置为 {@code REPAID}，逾期只在读取时派生。
 */
public interface LoanService {

    /**
     * 当前用户的全部借款，按发放时间倒序。
     */
    List<TravelLoan> listByUser(long userId);

    /**
     * 当前用户在某条行程下的借款，按发放时间倒序。
     */
    List<TravelLoan> listByTrip(long tripId, long userId);

    /**
     * 申请一笔借款并把净额打入钱包。
     */
    TravelLoan borrow(long userId, long tripId, LoanCreateRequest request);

    /**
     * 全额还清一笔借款；只校验归属与状态，不受账号状态阻断。
     */
    TravelLoan repay(long userId, long loanId);
}