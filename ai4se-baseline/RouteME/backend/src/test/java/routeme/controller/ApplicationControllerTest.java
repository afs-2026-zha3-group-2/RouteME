package routeme.controller;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ApplicationControllerTest {

    @Autowired
    private MockMvc mockMvc;

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
}