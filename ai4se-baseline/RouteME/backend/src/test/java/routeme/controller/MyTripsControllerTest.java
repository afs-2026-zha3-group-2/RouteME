package routeme.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class MyTripsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void in_publisherWithPendingApplications_out_groupsAndCount() throws Exception {
        mockMvc.perform(get("/api/me/trips").header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.published.length()").value(3))
                .andExpect(jsonPath("$.applied.length()").value(2))
                .andExpect(jsonPath("$.matched.length()").value(1))
                .andExpect(jsonPath("$.matched[0].id").value(6))
                .andExpect(jsonPath("$.completed.length()").value(2))
                                .andExpect(jsonPath("$.completed[0].id").value(1))
                .andExpect(jsonPath("$.pending_application_count").value(2));
    }

    @Test
    void in_companionWithNoPending_out_matchedExcludesCompleted() throws Exception {
        mockMvc.perform(get("/api/me/trips").header("X-User-Id", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.published.length()").value(2))
                .andExpect(jsonPath("$.applied.length()").value(2))
                .andExpect(jsonPath("$.matched.length()").value(0))
                .andExpect(jsonPath("$.completed.length()").value(1))
                .andExpect(jsonPath("$.completed[0].id").value(2))
                .andExpect(jsonPath("$.pending_application_count").value(0));
    }

    @Test
    void in_companionOnOpenTrip_out_matchedContainsTrip() throws Exception {
        mockMvc.perform(get("/api/me/trips").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.published.length()").value(1))
                                .andExpect(jsonPath("$.applied.length()").value(3))
                .andExpect(jsonPath("$.matched.length()").value(1))
                .andExpect(jsonPath("$.matched[0].id").value(4))
                                .andExpect(jsonPath("$.completed.length()").value(2))
                .andExpect(jsonPath("$.pending_application_count").value(0));
    }

    @Test
        void in_afterAccept_out_groupsReflectChange() throws Exception {
            mockMvc.perform(post("/api/applications/4/accept").header("X-User-Id", "2"))
                    .andExpect(status().isOk());

            mockMvc.perform(get("/api/me/trips").header("X-User-Id", "1"))
                    .andExpect(jsonPath("$.matched.length()").value(2))
                    .andExpect(jsonPath("$.applied[0].id").value(4))
                    .andExpect(jsonPath("$.applied[0].status").value("accepted"));
        }

        @Test
        void in_missingIdentity_out_demoUserRequired() throws Exception {
        mockMvc.perform(get("/api/me/trips"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("DEMO_USER_REQUIRED"));
    }
}