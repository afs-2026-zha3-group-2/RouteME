package routeme.controller;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import routeme.pojo.DemoUser;
import routeme.pojo.InsurancePolicy;
import routeme.pojo.TravelLoan;
import routeme.pojo.TripPlan;
import routeme.request.LoanCreateRequest;
import routeme.response.InsurancePolicyResponse;
import routeme.response.InsuranceRedirectResponse;
import routeme.response.InsuranceSummaryResponse;
import routeme.response.MyFinanceResponse;
import routeme.response.TravelLoanResponse;
import routeme.response.TripFinanceResponse;
import routeme.response.WalletLedgerEntryResponse;
import routeme.response.WalletResponse;
import routeme.service.ApplicationService;
import routeme.service.DemoUserService;
import routeme.service.FinanceEligibility;
import routeme.service.InsuranceService;
import routeme.service.LoanService;
import routeme.service.TripPlanService;
import routeme.service.WalletService;

/**
 * 旅行保障的对外接口：行程维度页、第三方保险入口与确认、借款 / 还款、账号聚合页。
 * 控制器只负责身份解析与响应组装，资格、账号状态与金额规则由服务层判定。
 */
@RestController
@RequestMapping("/api")
public class FinanceController {

    private final DemoUserService demoUserService;
    private final WalletService walletService;
    private final InsuranceService insuranceService;
    private final LoanService loanService;
    private final TripPlanService tripPlanService;
    private final ApplicationService applicationService;
    private final Clock clock;

    public FinanceController(
            DemoUserService demoUserService,
            WalletService walletService,
            InsuranceService insuranceService,
            LoanService loanService,
            TripPlanService tripPlanService,
            ApplicationService applicationService,
            Clock clock) {
        this.demoUserService = demoUserService;
        this.walletService = walletService;
        this.insuranceService = insuranceService;
        this.loanService = loanService;
        this.tripPlanService = tripPlanService;
        this.applicationService = applicationService;
        this.clock = clock;
    }

    @GetMapping("/trips/{tripId}/finance")
    public TripFinanceResponse tripFinance(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable long tripId) {
        DemoUser user = demoUserService.require(userId);
        TripPlan trip = tripPlanService.requireCurrent(tripId);
        Instant now = clock.instant();
        FinanceEligibility eligibility = FinanceEligibility.evaluate(
                trip, user.id(), applicationService.isAccepted(tripId, user.id()), now);
        InsurancePolicy policy = insuranceService.find(user.id(), tripId).orElse(null);
        return new TripFinanceResponse(
                trip.id(),
                trip.title(),
                trip.destination(),
                trip.status(now).wireValue(),
                trip.startDate(),
                trip.endDate(),
                applicationService.participants(tripId).size() - 1,
                eligibility.eligible(),
                eligibility.ineligibleReason(),
                WalletResponse.from(walletService.read(user.id())),
                new InsuranceSummaryResponse(
                        policy == null
                                ? InsurancePolicy.WIRE_NOT_PURCHASED
                                : policy.wireStatus(now),
                        insuranceService.provider(),
                        insuranceService.products(),
                        eligibility.eligible() ? insuranceService.purchaseUrl(user.id(), tripId) : null,
                        policy == null ? null : InsurancePolicyResponse.from(policy, now)),
                loanService.listByTrip(tripId, user.id()).stream()
                        .map(loan -> TravelLoanResponse.from(loan, now))
                        .toList());
    }

    @PostMapping("/trips/{tripId}/insurance/purchase")
    public InsuranceRedirectResponse purchaseInsurance(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable long tripId) {
        DemoUser user = demoUserService.require(userId);
        return new InsuranceRedirectResponse(insuranceService.purchaseUrl(user.id(), tripId));
    }

    @PostMapping("/trips/{tripId}/insurance/confirm")
    public InsurancePolicyResponse confirmInsurance(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable long tripId) {
        DemoUser user = demoUserService.require(userId);
        InsurancePolicy policy = insuranceService.confirm(user.id(), tripId);
        return InsurancePolicyResponse.from(policy, clock.instant());
    }

    @PostMapping("/trips/{tripId}/loans")
    public ResponseEntity<TravelLoanResponse> createLoan(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable long tripId,
            @RequestBody LoanCreateRequest request) {
        DemoUser user = demoUserService.require(userId);
        TravelLoan loan = loanService.borrow(user.id(), tripId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(TravelLoanResponse.from(loan, clock.instant()));
    }

    @PostMapping("/loans/{loanId}/repay")
    public TravelLoanResponse repayLoan(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable long loanId) {
        DemoUser user = demoUserService.require(userId);
        TravelLoan loan = loanService.repay(user.id(), loanId);
        return TravelLoanResponse.from(loan, clock.instant());
    }

    @GetMapping("/me/finance")
    public MyFinanceResponse myFinance(@RequestHeader(value = "X-User-Id", required = false) Long userId) {
        DemoUser user = demoUserService.require(userId);
        Instant now = clock.instant();
        return new MyFinanceResponse(
                WalletResponse.from(walletService.read(user.id())),
                walletService.ledgerOf(user.id()).stream().map(WalletLedgerEntryResponse::from).toList(),
                insuranceService.listByUser(user.id()).stream()
                        .map(policy -> InsurancePolicyResponse.from(policy, now))
                        .toList(),
                loanService.listByUser(user.id()).stream()
                        .map(loan -> TravelLoanResponse.from(loan, now))
                        .toList());
    }
}