package routeme.service.impl;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import routeme.constant.FinanceFeeConstant;
import routeme.entity.TravelLoanEntity;
import routeme.enums.LoanStatusEnum;
import routeme.enums.TripStatusEnum;
import routeme.enums.WalletEntryTypeEnum;
import routeme.enums.WriteScopeEnum;
import routeme.exception.ActiveLoanExistsException;
import routeme.exception.ForbiddenActionException;
import routeme.exception.InvalidInputException;
import routeme.exception.LoanNotActiveException;
import routeme.exception.TripNotOpenException;
import routeme.mapper.TravelLoanMapper;
import routeme.pojo.TravelLoan;
import routeme.pojo.TripPlan;
import routeme.request.LoanCreateRequest;
import routeme.service.AccountStatusService;
import routeme.service.ApplicationService;
import routeme.service.LoanService;
import routeme.service.TripPlanService;
import routeme.service.WalletService;

/**
 * 借款与还款的业务实现（design D5 / D6）。
 *
 * <p>发放：入参 → 行程 → 资格 → 状态 → 账号状态 → 单笔进行中 → 净额入账 → 插入借款；
 * 还款：归属 → 状态 → 扣本金 → 条件更新；逾期只在响应派生，不落库、不罚息。</p>
 */
@Service
public class LoanServiceImpl extends AbstractServiceImpl<TravelLoanMapper, TravelLoanEntity> implements LoanService {

    private static final int MIN_PRINCIPAL_CENTS = 10_000;
    private static final int MAX_PRINCIPAL_CENTS = 200_000;
    private static final List<Integer> TERM_DAYS = List.of(7, 14, 30);
    private static final String RELATED_TYPE = "travel_loan";

    private final TripPlanService tripPlanService;
    private final ApplicationService applicationService;
    private final AccountStatusService accountStatusService;
    private final WalletService walletService;
    private final Clock clock;

    public LoanServiceImpl(
            TripPlanService tripPlanService,
            ApplicationService applicationService,
            AccountStatusService accountStatusService,
            WalletService walletService,
            Clock clock) {
        this.tripPlanService = tripPlanService;
        this.applicationService = applicationService;
        this.accountStatusService = accountStatusService;
        this.walletService = walletService;
        this.clock = clock;
    }

    @Override
    public List<TravelLoan> listByUser(long userId) {
        return list(Wrappers.<TravelLoanEntity>lambdaQuery()
                .eq(TravelLoanEntity::getUserId, userId)
                .orderByDesc(TravelLoanEntity::getFundedAt)
                .orderByDesc(TravelLoanEntity::getId))
                .stream()
                .map(LoanServiceImpl::toLoan)
                .toList();
    }

    @Override
    public List<TravelLoan> listByTrip(long tripId, long userId) {
        return list(Wrappers.<TravelLoanEntity>lambdaQuery()
                .eq(TravelLoanEntity::getUserId, userId)
                .eq(TravelLoanEntity::getTripId, tripId)
                .orderByDesc(TravelLoanEntity::getFundedAt)
                .orderByDesc(TravelLoanEntity::getId))
                .stream()
                .map(LoanServiceImpl::toLoan)
                .toList();
    }

    @Override
    @Transactional
    public TravelLoan borrow(long userId, long tripId, LoanCreateRequest request) {
        int principalCents = validatePrincipal(request);
        int termDays = validateTerm(request);

        TripPlan trip = tripPlanService.requireCurrent(tripId);
        if (trip.publisherId() != userId && !applicationService.isAccepted(tripId, userId)) {
            throw new ForbiddenActionException("only participants can borrow for trip " + tripId);
        }
        Instant now = clock.instant();
        TripStatusEnum status = trip.status(now);
        if (status != TripStatusEnum.RECRUITING
                && status != TripStatusEnum.FULL
                && status != TripStatusEnum.ONGOING) {
            throw new TripNotOpenException(tripId);
        }
        accountStatusService.assertCanWrite(userId, WriteScopeEnum.BUSINESS);

        boolean activeExists = count(Wrappers.<TravelLoanEntity>lambdaQuery()
                .eq(TravelLoanEntity::getUserId, userId)
                .eq(TravelLoanEntity::getStatus, LoanStatusEnum.ACTIVE.name())) > 0;
        if (activeExists) {
            throw new ActiveLoanExistsException(userId);
        }

        int serviceFeeCents = FinanceFeeConstant.feeOf(principalCents);
        int disbursedCents = principalCents - serviceFeeCents;
        int interestCents = FinanceFeeConstant.interestOf(principalCents, termDays);
        int repayCents = principalCents + interestCents;
        Instant dueAt = now.plus(termDays, ChronoUnit.DAYS);

        long loanId = nextId(TravelLoanEntity::getId);
        walletService.credit(
                userId,
                disbursedCents,
                WalletEntryTypeEnum.LOAN_DISBURSEMENT,
                RELATED_TYPE,
                String.valueOf(loanId));
        TravelLoan loan = new TravelLoan(
                loanId,
                userId,
                tripId,
                principalCents,
                serviceFeeCents,
                disbursedCents,
                interestCents,
                repayCents,
                0,
                termDays,
                LoanStatusEnum.ACTIVE,
                now,
                dueAt,
                null);
        try {
            save(toEntity(loan));
        } catch (DuplicateKeyException exception) {
            // 并发借款命中 ux_travel_loan_active_user：事务回滚入账与流水。
            throw new ActiveLoanExistsException(userId);
        }
        return loan;
    }

    @Override
    @Transactional
    public TravelLoan repay(long userId, long loanId) {
        TravelLoanEntity loan = getById(loanId);
        if (loan == null || loan.getUserId() != userId) {
            // 不区分「不存在」与「他人的借款」，避免泄漏订单存在性。
            throw new ForbiddenActionException("loan does not belong to user " + userId);
        }
        if (!LoanStatusEnum.ACTIVE.name().equals(loan.getStatus())) {
            throw new LoanNotActiveException(loanId);
        }

        Instant now = clock.instant();
        int penaltyCents = FinanceFeeConstant.penaltyOf(
                loan.getPrincipalCents(),
                FinanceFeeConstant.overdueDaysOf(Instant.parse(loan.getDueAt()), now));
        int totalRepayCents = loan.getRepayCents() + penaltyCents;

        walletService.debit(
                userId,
                totalRepayCents,
                WalletEntryTypeEnum.LOAN_REPAYMENT,
                RELATED_TYPE,
                String.valueOf(loanId));
        int updated = baseMapper.repayIfActive(loanId, userId, now.toString(), penaltyCents);
        if (updated == 0) {
            // 并发重复还款只成功一次；事务回滚本次扣款。
            throw new LoanNotActiveException(loanId);
        }
        return toLoan(getById(loanId));
    }

    private static int validatePrincipal(LoanCreateRequest request) {
        Integer principal = request == null ? null : request.principalCents();
        if (principal == null
                || principal < MIN_PRINCIPAL_CENTS
                || principal > MAX_PRINCIPAL_CENTS
                || principal % 100 != 0) {
            throw new InvalidInputException("principal_cents must be whole yuan between 100 and 2000");
        }
        return principal;
    }

    private static int validateTerm(LoanCreateRequest request) {
        Integer termDays = request == null ? null : request.termDays();
        if (termDays == null || !TERM_DAYS.contains(termDays)) {
            throw new InvalidInputException("term_days must be 7, 14 or 30");
        }
        return termDays;
    }

    private static TravelLoanEntity toEntity(TravelLoan loan) {
        TravelLoanEntity entity = new TravelLoanEntity();
        entity.setId(loan.id());
        entity.setUserId(loan.userId());
        entity.setTripId(loan.tripId());
        entity.setPrincipalCents(loan.principalCents());
        entity.setServiceFeeCents(loan.serviceFeeCents());
        entity.setDisbursedCents(loan.disbursedCents());
        entity.setInterestCents(loan.interestCents());
        entity.setRepayCents(loan.repayCents());
        entity.setPenaltyCents(loan.penaltyCents());
        entity.setTermDays(loan.termDays());
        entity.setStatus(loan.storedStatus().name());
        entity.setActiveUserId(loan.storedStatus() == LoanStatusEnum.ACTIVE ? loan.userId() : null);
        entity.setFundedAt(loan.fundedAt().toString());
        entity.setDueAt(loan.dueAt().toString());
        entity.setRepaidAt(loan.repaidAt() == null ? null : loan.repaidAt().toString());
        return entity;
    }

    private static TravelLoan toLoan(TravelLoanEntity entity) {
        return new TravelLoan(
                entity.getId(),
                entity.getUserId(),
                entity.getTripId(),
                entity.getPrincipalCents(),
                entity.getServiceFeeCents(),
                entity.getDisbursedCents(),
                entity.getInterestCents(),
                entity.getRepayCents(),
                entity.getPenaltyCents(),
                entity.getTermDays(),
                LoanStatusEnum.ofCode(entity.getStatus()),
                Instant.parse(entity.getFundedAt()),
                Instant.parse(entity.getDueAt()),
                entity.getRepaidAt() == null ? null : Instant.parse(entity.getRepaidAt()));
    }
}