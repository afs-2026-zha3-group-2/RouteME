package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import routeme.config.FixedClockTestConfig;
import routeme.constant.TripTimeZoneConstant;
import routeme.entity.CreditExitEventEntity;
import routeme.entity.CreditLedgerEntity;
import routeme.enums.CreditExitReviewStatus;
import routeme.mapper.CreditExitEventMapper;
import routeme.mapper.CreditLedgerMapper;
import routeme.pojo.CreditExitEvent;
import routeme.pojo.TripApplication;
import routeme.pojo.TripMeetingRules;
import routeme.pojo.TripPlan;
import routeme.request.ApplicationCreateRequest;
import routeme.request.TripCreateRequest;
import routeme.service.ApplicationService;
import routeme.service.CreditEnforcementService;
import routeme.service.CreditService;
import routeme.service.TripPlanService;

/**
 * 退出扣分的 API 验收：六档、月度翻倍、待核实、集合时间优先、旅行中 -15。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(FixedClockTestConfig.class)
class CreditExitApiTest {

    private static final long PUBLISHER = 3L;
    private static final long APPLICANT = 1L;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TripPlanService tripPlanService;

    @Autowired
    private ApplicationService applicationService;

    @Autowired
    private CreditEnforcementService creditEnforcementService;

    @Autowired
    private CreditService creditService;

    @Autowired
    private CreditExitEventMapper exitEventMapper;

    @Autowired
    private CreditLedgerMapper ledgerMapper;

    @Test
    void in_48Hours_outMinus5AndLedger() throws Exception {
        long tripId = createTripAndAccept(Duration.ofHours(48));

        mockMvc.perform(get("/api/trips/" + tripId + "/leave-preview?reason=personal")
                        .header("X-User-Id", String.valueOf(APPLICANT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.penalty_tier").value("h24to72"))
                .andExpect(jsonPath("$.theoretical_delta").value(-5))
                .andExpect(jsonPath("$.applied_delta").value(-5))
                .andExpect(jsonPath("$.monthly_ordinal").value(1))
                .andExpect(jsonPath("$.counted").value(true))
                .andExpect(jsonPath("$.resulting_score").value(75))
                .andExpect(jsonPath("$.message_code").value("penalty"));

        mockMvc.perform(post("/api/trips/" + tripId + "/leave")
                        .header("X-User-Id", String.valueOf(APPLICANT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"personal\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credit_score").value(75))
                .andExpect(jsonPath("$.credit_restricted").value(false))
                .andExpect(jsonPath("$.applied_delta").value(-5))
                .andExpect(jsonPath("$.review_status").value("not_required"));

        CreditLedgerEntity ledger = ledgerRows(APPLICANT).getLast();
        assertAll(
                () -> assertEquals("EXIT_BEFORE_TRIP", ledger.getReasonCode()),
                () -> assertEquals(-5, ledger.getAppliedDelta()),
                () -> assertEquals(80, ledger.getScoreBefore()),
                () -> assertEquals(75, ledger.getScoreAfter()));
    }

    @Test
    void in_exactlySevenDays_outZeroAndFactOnly() throws Exception {
        long tripId = createTripAndAccept(Duration.ofDays(7));

        mockMvc.perform(get("/api/trips/" + tripId + "/leave-preview?reason=personal")
                        .header("X-User-Id", String.valueOf(APPLICANT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.penalty_tier").value("ge7d"))
                .andExpect(jsonPath("$.theoretical_delta").value(0))
                .andExpect(jsonPath("$.monthly_ordinal").value(0))
                .andExpect(jsonPath("$.counted").value(false))
                .andExpect(jsonPath("$.message_code").value("no_penalty"));

        mockMvc.perform(post("/api/trips/" + tripId + "/leave")
                        .header("X-User-Id", String.valueOf(APPLICANT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"personal\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credit_score").value(80))
                .andExpect(jsonPath("$.applied_delta").value(0));

        CreditLedgerEntity ledger = ledgerRows(APPLICANT).getLast();
        assertEquals("EXIT_BEFORE_TRIP_NO_PENALTY", ledger.getReasonCode());
        assertEquals(0, ledger.getAppliedDelta());
        assertEquals(80, ledger.getScoreAfter());
    }

    @Test
    void in_secondPreTripExit_outDoubled() throws Exception {
        long firstTrip = createTripAndAccept(Duration.ofHours(48));
        mockMvc.perform(post("/api/trips/" + firstTrip + "/leave")
                        .header("X-User-Id", String.valueOf(APPLICANT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"personal\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credit_score").value(75));

        long secondTrip = createTripAndAccept(Duration.ofHours(48));
        mockMvc.perform(get("/api/trips/" + secondTrip + "/leave-preview?reason=personal")
                        .header("X-User-Id", String.valueOf(APPLICANT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.monthly_ordinal").value(2))
                .andExpect(jsonPath("$.monthly_doubled").value(true))
                .andExpect(jsonPath("$.theoretical_delta").value(-10))
                .andExpect(jsonPath("$.applied_delta").value(-10))
                .andExpect(jsonPath("$.resulting_score").value(65))
                .andExpect(jsonPath("$.message_code").value("penalty_doubled"));

        mockMvc.perform(post("/api/trips/" + secondTrip + "/leave")
                        .header("X-User-Id", String.valueOf(APPLICANT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"personal\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credit_score").value(65))
                .andExpect(jsonPath("$.applied_delta").value(-10));
    }

    @Test
    void in_forceMajeurePendingAndReview_outNoDeductionUntilVerifiedFalse() throws Exception {
        long pendingTrue = createTripAndAccept(Duration.ofHours(48));
        mockMvc.perform(post("/api/trips/" + pendingTrue + "/leave")
                        .header("X-User-Id", String.valueOf(APPLICANT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"force_majeure\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credit_score").value(80))
                .andExpect(jsonPath("$.applied_delta").value(0))
                .andExpect(jsonPath("$.review_status").value("pending"));
        CreditExitEvent trueEvent = exitEvent(pendingTrue);
        CreditExitEvent verifiedTrue = creditEnforcementService.reviewExit(trueEvent.id(), true);
        assertEquals(CreditExitReviewStatus.VERIFIED_TRUE, verifiedTrue.reviewStatus());

        long personal = createTripAndAccept(Duration.ofHours(48));
        mockMvc.perform(post("/api/trips/" + personal + "/leave")
                        .header("X-User-Id", String.valueOf(APPLICANT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"personal\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credit_score").value(75));

        long pendingFalse = createTripAndAccept(Duration.ofHours(48));
        mockMvc.perform(post("/api/trips/" + pendingFalse + "/leave")
                        .header("X-User-Id", String.valueOf(APPLICANT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"safety\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credit_score").value(75))
                .andExpect(jsonPath("$.review_status").value("pending"));
        CreditExitEvent falseEvent = exitEvent(pendingFalse);
        CreditExitEvent verifiedFalse = creditEnforcementService.reviewExit(falseEvent.id(), false);

        assertAll(
                () -> assertEquals(CreditExitReviewStatus.VERIFIED_FALSE, verifiedFalse.reviewStatus()),
                () -> assertEquals(2, verifiedFalse.monthlyOrdinal()),
                () -> assertEquals(-10, verifiedFalse.theoreticalDelta()),
                () -> assertEquals(-10, verifiedFalse.appliedDelta()),
                () -> assertEquals(65, creditService.read(APPLICANT).score()));
    }

    @Test
    void in_meetingTimePriorityAndDuring_outUsesMeetingTimeThenMinus15() throws Exception {
        long priorityTrip = createTripWithStartTodayAndMeetingAfter48Hours();
        mockMvc.perform(get("/api/trips/" + priorityTrip + "/leave-preview?reason=personal")
                        .header("X-User-Id", String.valueOf(APPLICANT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.penalty_tier").value("h24to72"))
                .andExpect(jsonPath("$.theoretical_delta").value(-5))
                .andExpect(jsonPath("$.monthly_ordinal").value(1));
        long priorityLeft = priorityTrip;
        mockMvc.perform(post("/api/trips/" + priorityLeft + "/leave")
                        .header("X-User-Id", String.valueOf(APPLICANT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"personal\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credit_score").value(75));

        long duringTrip = createDuringTripAndAccept();
        mockMvc.perform(get("/api/trips/" + duringTrip + "/leave-preview?reason=personal")
                        .header("X-User-Id", String.valueOf(APPLICANT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.penalty_tier").value("during"))
                .andExpect(jsonPath("$.theoretical_delta").value(-15))
                .andExpect(jsonPath("$.monthly_ordinal").value(0))
                .andExpect(jsonPath("$.counted").value(false))
                .andExpect(jsonPath("$.message_code").value("during_trip"));

        mockMvc.perform(post("/api/trips/" + duringTrip + "/leave")
                        .header("X-User-Id", String.valueOf(APPLICANT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"personal\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credit_score").value(60))
                .andExpect(jsonPath("$.applied_delta").value(-15));
    }

    private long createTripAndAccept(Duration untilMeeting) {
        LocalDateTime meeting = FixedClockTestConfig.NOW.plus(untilMeeting)
                .atZone(TripTimeZoneConstant.ZONE).toLocalDateTime();
        return createTripAndAccept(meeting.toLocalDate(), meeting.toLocalDate().plusDays(1), meeting);
    }

    private long createTripWithStartTodayAndMeetingAfter48Hours() {
        LocalDate today = LocalDate.ofInstant(FixedClockTestConfig.NOW, TripTimeZoneConstant.ZONE);
        LocalDateTime meeting = FixedClockTestConfig.NOW.plus(Duration.ofHours(48))
                .atZone(TripTimeZoneConstant.ZONE).toLocalDateTime();
        return createTripAndAccept(today, today.plusDays(3), meeting);
    }

    private long createDuringTripAndAccept() {
        LocalDate today = LocalDate.ofInstant(FixedClockTestConfig.NOW, TripTimeZoneConstant.ZONE);
        LocalDateTime meeting = FixedClockTestConfig.NOW.minus(Duration.ofHours(1))
                .atZone(TripTimeZoneConstant.ZONE).toLocalDateTime();
        return createTripAndAccept(today, today, meeting);
    }

    private long createTripAndAccept(LocalDate start, LocalDate end, LocalDateTime meeting) {
        TripPlan trip = tripPlanService.create(new TripCreateRequest(
                "信用验收 " + System.nanoTime(),
                "440400",
                start,
                end,
                List.of("集合点", "终点"),
                List.<String>of(),
                meeting.format(TripMeetingRules.FORMAT),
                null,
                null,
                null,
                null,
                List.of("摄影"),
                Integer.valueOf(2),
                null), PUBLISHER);
        TripApplication application = applicationService.apply(
                trip.id(), APPLICANT, new ApplicationCreateRequest("信用验收"));
        applicationService.accept(application.id(), PUBLISHER);
        return trip.id();
    }

    private CreditExitEvent exitEvent(long tripId) {
        CreditExitEventEntity entity = exitEventMapper.selectOne(Wrappers.<CreditExitEventEntity>lambdaQuery()
                .eq(CreditExitEventEntity::getUserId, APPLICANT)
                .eq(CreditExitEventEntity::getTripId, tripId)
                .orderByDesc(CreditExitEventEntity::getId)
                .last("LIMIT 1"));
        return entity.toEvent();
    }

    private List<CreditLedgerEntity> ledgerRows(long userId) {
        return ledgerMapper.selectList(Wrappers.<CreditLedgerEntity>lambdaQuery()
                .eq(CreditLedgerEntity::getUserId, userId)
                .orderByAsc(CreditLedgerEntity::getId));
    }
}
