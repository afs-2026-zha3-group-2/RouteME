package routeme.controller;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import routeme.config.FixedClockTestConfig;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(FixedClockTestConfig.class)
class ApplicationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Test
    void in_openTrip_out_pendingApplication() throws Exception {
        mockMvc.perform(post("/api/trips/3/applications")
                        .header("X-User-Id", "3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\" 想一起拍日落，我带三脚架。 \"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.trip_id").value(3))
                .andExpect(jsonPath("$.applicant.id").value(3))
                .andExpect(jsonPath("$.message").value("想一起拍日落，我带三脚架。"))
                .andExpect(jsonPath("$.status").value("pending"))
                .andExpect(jsonPath("$.decided_at").value(nullValue()))
                .andExpect(jsonPath("$.trip.id").value(3));
    }

    @Test
    void in_blankMessage_out_nullMessage() throws Exception {
        mockMvc.perform(post("/api/trips/3/applications")
                        .header("X-User-Id", "3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"   \"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value(nullValue()));
    }

    @Test
    void in_ownTrip_out_forbidden() throws Exception {
        mockMvc.perform(post("/api/trips/3/applications")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void in_existingPendingApplication_out_duplicate() throws Exception {
        mockMvc.perform(post("/api/trips/3/applications")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE_APPLICATION"));
    }

    @Test
    void in_fullTrip_out_notOpen() throws Exception {
        mockMvc.perform(post("/api/trips/6/applications")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_OPEN"));
    }

    @Test
    void in_completedTrip_out_notOpen() throws Exception {
        mockMvc.perform(post("/api/trips/1/applications")
                        .header("X-User-Id", "3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_OPEN"));
    }

    @Test
    void in_messageOverLimit_out_invalidInput() throws Exception {
        String tooLong = "很".repeat(121);
        mockMvc.perform(post("/api/trips/3/applications")
                        .header("X-User-Id", "3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"" + tooLong + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_missingIdentity_out_demoUserRequired() throws Exception {
        mockMvc.perform(post("/api/trips/3/applications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("DEMO_USER_REQUIRED"));
    }

    @Test
    void in_pendingApplication_out_cancelled() throws Exception {
        mockMvc.perform(post("/api/applications/4/cancel").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(4))
                .andExpect(jsonPath("$.status").value("cancelled"))
                .andExpect(jsonPath("$.decided_at").isNotEmpty());
    }

    @Test
    void in_cancelByOtherUser_out_forbidden() throws Exception {
        mockMvc.perform(post("/api/applications/4/cancel").header("X-User-Id", "2"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void in_cancelAcceptedApplication_out_notPending() throws Exception {
        mockMvc.perform(post("/api/applications/1/cancel").header("X-User-Id", "2"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("APPLICATION_NOT_PENDING"));
    }

    @Test
    void in_cancelUnknownApplication_out_notFound() throws Exception {
        mockMvc.perform(post("/api/applications/9999/cancel").header("X-User-Id", "1"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("APPLICATION_NOT_FOUND"));
    }

    @Test
        void in_publisherListsApplications_out_sortedWithApplicant() throws Exception {
            mockMvc.perform(get("/api/trips/3/applications").header("X-User-Id", "2"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].id").value(4))
                    .andExpect(jsonPath("$[0].applicant.nickname").value("林见夏"))
                    .andExpect(jsonPath("$[0].message").isNotEmpty());
        }

        @Test
        void in_nonPublisherListsApplications_out_forbidden() throws Exception {
            mockMvc.perform(get("/api/trips/3/applications").header("X-User-Id", "1"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        }

        @Test
        void in_acceptPendingApplication_out_acceptedAndJoined() throws Exception {
            mockMvc.perform(post("/api/applications/6/accept").header("X-User-Id", "2"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("accepted"))
                    .andExpect(jsonPath("$.decided_at").isNotEmpty());

            mockMvc.perform(get("/api/trips/5").header("X-User-Id", "2"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.joined_count").value(2))
                    .andExpect(jsonPath("$.participants.length()").value(2))
                    .andExpect(jsonPath("$.participants[1].id").value(3));
        }

        @Test
        void in_rejectPendingApplication_out_rejected() throws Exception {
            mockMvc.perform(post("/api/applications/6/reject").header("X-User-Id", "2"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("rejected"));

            mockMvc.perform(get("/api/trips/5").header("X-User-Id", "2"))
                    .andExpect(jsonPath("$.joined_count").value(1));
        }

        @Test
        void in_acceptByNonPublisher_out_forbidden() throws Exception {
            mockMvc.perform(post("/api/applications/6/accept").header("X-User-Id", "1"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        }

        @Test
        void in_acceptAlreadyAccepted_out_notPending() throws Exception {
            mockMvc.perform(post("/api/applications/1/accept").header("X-User-Id", "1"))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.code").value("APPLICATION_NOT_PENDING"));
        }

        @Test
        void in_acceptedCompanion_out_leavesAndCanReapply() throws Exception {
            mockMvc.perform(get("/api/trips/4/leave-preview?reason=personal").header("X-User-Id", "1"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.penalty_tier").value("during"))
                    .andExpect(jsonPath("$.theoretical_delta").value(-15))
                    .andExpect(jsonPath("$.applied_delta").value(-15))
                    .andExpect(jsonPath("$.monthly_ordinal").value(0));

            mockMvc.perform(post("/api/trips/4/leave")
                            .header("X-User-Id", "1")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"reason\":\"personal\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.credit_score").value(65))
                    .andExpect(jsonPath("$.credit_level").value("fair"))
                    .andExpect(jsonPath("$.credit_restricted").value(false))
                    .andExpect(jsonPath("$.theoretical_delta").value(-15))
                    .andExpect(jsonPath("$.applied_delta").value(-15))
                    .andExpect(jsonPath("$.review_status").value("not_required"));

            mockMvc.perform(get("/api/me/applications").header("X-User-Id", "1"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[?(@.trip_id == 4)].status", hasItem("left")));

            mockMvc.perform(get("/api/users/1/profile").header("X-User-Id", "2"))
                    .andExpect(jsonPath("$.stats.joined").value(1));

            mockMvc.perform(get("/api/trips/4").header("X-User-Id", "1"))
                    .andExpect(jsonPath("$.joined_count").value(1))
                    .andExpect(jsonPath("$.status").value("ongoing"))
                    .andExpect(jsonPath("$.participants.length()").value(1));

            mockMvc.perform(post("/api/trips/4/applications")
                            .header("X-User-Id", "1")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"message\":\"退出后想再跟一次。\"}"))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.status").value("pending"));
        }

        @Test
        void in_publisherLeave_out_forbidden() throws Exception {
            mockMvc.perform(post("/api/trips/3/leave")
                            .header("X-User-Id", "2")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"reason\":\"personal\"}"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        }

        @Test
        void in_nonCompanionLeave_out_forbidden() throws Exception {
            mockMvc.perform(post("/api/trips/5/leave")
                            .header("X-User-Id", "1")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"reason\":\"personal\"}"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        }

        @Test
        void in_completedTripLeave_out_notOpen() throws Exception {
            mockMvc.perform(post("/api/trips/1/leave")
                            .header("X-User-Id", "2")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"reason\":\"personal\"}"))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.code").value("TRIP_NOT_OPEN"));
        }

        @Test
        void in_missingLeaveReason_out_invalidInput() throws Exception {
            mockMvc.perform(post("/api/trips/4/leave")
                            .header("X-User-Id", "1")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        }

        @Test
        void in_myApplications_out_withTripAndApplicant() throws Exception {
        mockMvc.perform(get("/api/me/applications").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(4))
                .andExpect(jsonPath("$[0].applicant.nickname").value("林见夏"))
                                .andExpect(jsonPath("$[0].trip.title").value("珠海情侣路日落机位二刷"))
                                .andExpect(jsonPath("$[0].status").value("pending"))
                                .andExpect(jsonPath("$[1].id").value(5))
                                .andExpect(jsonPath("$[1].status").value("accepted"));
    }

        @Test
        void in_suspendedApplicant_out_accountSuspendedAndNoNewApplication() throws Exception {
            jdbcClient.sql("UPDATE app_users SET status = 'SUSPENDED' WHERE id = 1").update();
            Integer before = jdbcClient.sql("SELECT COUNT(*) FROM trip_applications")
                    .query(Integer.class)
                    .single();

            mockMvc.perform(post("/api/trips/3/applications")
                            .header("X-User-Id", "1")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("ACCOUNT_SUSPENDED"));

            Integer after = jdbcClient.sql("SELECT COUNT(*) FROM trip_applications")
                    .query(Integer.class)
                    .single();
            assertEquals(before, after, "suspended applicant writes no application row");
        }
    }