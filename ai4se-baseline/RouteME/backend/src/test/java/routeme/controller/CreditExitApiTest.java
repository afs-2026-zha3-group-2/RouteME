package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import routeme.config.FixedClockTestConfig;
import routeme.constant.TripTimeZoneConstant;
import routeme.entity.CreditExitAttachmentEntity;
import routeme.entity.CreditExitEventEntity;
import routeme.entity.CreditLedgerEntity;
import routeme.enums.CreditExitReviewStatus;
import routeme.mapper.CreditExitAttachmentMapper;
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
@SpringBootTest(properties = "routeme.credit.exit-evidence-dir=target/test-exit-evidence")
@AutoConfigureMockMvc
@Transactional
@Import(FixedClockTestConfig.class)
class CreditExitApiTest {

    private static final long PUBLISHER = 3L;
    private static final long APPLICANT = 1L;
    private static final byte[] PNG_BYTES = {
            (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A,
            0, 0, 0, 0, 'I', 'E', 'N', 'D', (byte) 0xAE, 0x42, 0x60, (byte) 0x82
    };

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
    private CreditExitAttachmentMapper attachmentMapper;

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
                        .content("{\"reason\":\"force_majeure\",\"note\":\"台风停航\"}"))
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
                        .content("{\"reason\":\"safety\",\"note\":\"有人在集合点尾随\"}"))
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

    @Test
    void in_safetyOrForceMajeureWithoutNote_out400AndNoEvent() throws Exception {
        long safetyTrip = createTripAndAccept(Duration.ofHours(48));
        mockMvc.perform(post("/api/trips/" + safetyTrip + "/leave")
                        .header("X-User-Id", String.valueOf(APPLICANT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"safety\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));

        long forceTrip = createTripAndAccept(Duration.ofHours(48));
        mockMvc.perform(post("/api/trips/" + forceTrip + "/leave")
                        .header("X-User-Id", String.valueOf(APPLICANT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"force_majeure\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));

        assertAll(
                () -> assertEquals(0, exitEventMapper.selectCount(Wrappers.<CreditExitEventEntity>lambdaQuery()
                        .eq(CreditExitEventEntity::getUserId, APPLICANT)), "no exit event written"),
                () -> assertEquals(80, creditService.read(APPLICANT).score(), "score unchanged"));
    }

    @Test
    void in_noteTooLong_out400() throws Exception {
        long tripId = createTripAndAccept(Duration.ofHours(48));
        String longNote = "说".repeat(201);
        mockMvc.perform(post("/api/trips/" + tripId + "/leave")
                        .header("X-User-Id", String.valueOf(APPLICANT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"personal\",\"note\":\"" + longNote + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_personalWithNoteAndEvidence_outBoundToExitEvent() throws Exception {
        long tripId = createTripAndAccept(Duration.ofHours(48));
        long first = uploadEvidence(tripId, "proof-1.png");
        long second = uploadEvidence(tripId, "proof-2.png");

        mockMvc.perform(post("/api/trips/" + tripId + "/leave")
                        .header("X-User-Id", String.valueOf(APPLICANT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"personal\",\"note\":\"临时加班\","
                                + "\"attachment_ids\":[" + first + "," + second + "]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.applied_delta").value(-5));

        CreditExitEvent event = exitEvent(tripId);
        List<CreditExitAttachmentEntity> rows = attachments(APPLICANT, tripId);
        assertAll(
                () -> assertEquals("临时加班", event.exitNote()),
                () -> assertEquals(2, rows.size()),
                () -> assertTrue(rows.stream().allMatch(row -> event.id() == row.getExitEventId())));
    }

    @Test
    void in_evidenceUpload_outLimitsAndMagicChecked() throws Exception {
        long tripId = createTripAndAccept(Duration.ofHours(48));
        uploadEvidence(tripId, "proof-1.png");
        uploadEvidence(tripId, "proof-2.png");
        uploadEvidence(tripId, "proof-3.png");

        mockMvc.perform(multipart("/api/trips/" + tripId + "/leave-evidence")
                        .file(new MockMultipartFile("file", "proof-4.png", "image/png", PNG_BYTES))
                        .header("X-User-Id", String.valueOf(APPLICANT)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));

        long otherTrip = createTripAndAccept(Duration.ofHours(48));
        mockMvc.perform(multipart("/api/trips/" + otherTrip + "/leave-evidence")
                        .file(new MockMultipartFile("file", "fake.png", "image/png", "not-an-image".getBytes()))
                        .header("X-User-Id", String.valueOf(APPLICANT)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_ownerCanReadLeaveRecordAndEvidence_outOthersCannot() throws Exception {
        long tripId = createTripAndAccept(Duration.ofHours(48));
        long first = uploadEvidence(tripId, "proof-1.png");
        long second = uploadEvidence(tripId, "proof-2.png");
        mockMvc.perform(post("/api/trips/" + tripId + "/leave")
                        .header("X-User-Id", String.valueOf(APPLICANT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"personal\",\"note\":\"临时加班\","
                                + "\"attachment_ids\":[" + first + "," + second + "]}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/trips/" + tripId + "/leave-record")
                        .header("X-User-Id", String.valueOf(APPLICANT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].reason").value("personal"))
                .andExpect(jsonPath("$[0].note").value("临时加班"))
                .andExpect(jsonPath("$[0].review_status").value("not_required"))
                .andExpect(jsonPath("$[0].theoretical_delta").value(-5))
                .andExpect(jsonPath("$[0].applied_delta").value(-5))
                .andExpect(jsonPath("$[0].monthly_ordinal").value(1))
                .andExpect(jsonPath("$[0].attachments.length()").value(2))
                .andExpect(jsonPath("$[0].attachments[0].url").value("/api/leave-evidence/" + first));

        mockMvc.perform(get("/api/leave-evidence/" + first)
                        .header("X-User-Id", String.valueOf(APPLICANT)))
                .andExpect(status().isOk())
                .andExpect(content().contentType("image/png"))
                .andExpect(content().bytes(PNG_BYTES));

        mockMvc.perform(get("/api/trips/" + tripId + "/leave-record")
                        .header("X-User-Id", String.valueOf(PUBLISHER)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("LEAVE_RECORD_NOT_FOUND"));

        mockMvc.perform(get("/api/leave-evidence/" + first)
                        .header("X-User-Id", String.valueOf(PUBLISHER)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void in_rejoinSameTrip_outSecondExitCountsAndListsBothRecords() throws Exception {
        long tripId = createTripAndAccept(Duration.ofHours(48));
        mockMvc.perform(post("/api/trips/" + tripId + "/leave")
                        .header("X-User-Id", String.valueOf(APPLICANT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"personal\",\"note\":\"第一次退出\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credit_score").value(75))
                .andExpect(jsonPath("$.monthly_ordinal").value(1));

        TripApplication again = applicationService.apply(
                tripId, APPLICANT, new ApplicationCreateRequest("再次申请"));
        applicationService.accept(again.id(), PUBLISHER);

        mockMvc.perform(post("/api/trips/" + tripId + "/leave")
                        .header("X-User-Id", String.valueOf(APPLICANT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"personal\",\"note\":\"第二次退出\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credit_score").value(65))
                .andExpect(jsonPath("$.applied_delta").value(-10))
                .andExpect(jsonPath("$.monthly_ordinal").value(2))
                .andExpect(jsonPath("$.message_code").value("penalty_doubled"));

        mockMvc.perform(get("/api/trips/" + tripId + "/leave-record")
                        .header("X-User-Id", String.valueOf(APPLICANT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].note").value("第二次退出"))
                .andExpect(jsonPath("$[0].monthly_ordinal").value(2))
                .andExpect(jsonPath("$[1].note").value("第一次退出"));

        // 同一关系重试：幂等返回最新结果，不再新增事件
        mockMvc.perform(post("/api/trips/" + tripId + "/leave")
                        .header("X-User-Id", String.valueOf(APPLICANT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"personal\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credit_score").value(65));
        assertEquals(2, exitEventMapper.selectCount(Wrappers.<CreditExitEventEntity>lambdaQuery()
                .eq(CreditExitEventEntity::getUserId, APPLICANT)
                .eq(CreditExitEventEntity::getTripId, tripId)));
    }

    private long uploadEvidence(long tripId, String fileName) throws Exception {
        mockMvc.perform(multipart("/api/trips/" + tripId + "/leave-evidence")
                        .file(new MockMultipartFile("file", fileName, "image/png", PNG_BYTES))
                        .header("X-User-Id", String.valueOf(APPLICANT)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber());
        List<CreditExitAttachmentEntity> rows = attachments(APPLICANT, tripId);
        assertNotNull(rows);
        return rows.getLast().getId();
    }

    private List<CreditExitAttachmentEntity> attachments(long userId, long tripId) {
        return attachmentMapper.selectList(Wrappers.<CreditExitAttachmentEntity>lambdaQuery()
                .eq(CreditExitAttachmentEntity::getUserId, userId)
                .eq(CreditExitAttachmentEntity::getTripId, tripId)
                .orderByAsc(CreditExitAttachmentEntity::getId));
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
                Integer.valueOf(2)), PUBLISHER);
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
