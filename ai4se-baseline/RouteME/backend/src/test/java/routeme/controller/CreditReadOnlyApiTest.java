package routeme.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;

/**
 * 信用分只读：不存在写分端点；资料保存请求携带 credit_score 也不会改变分数。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CreditReadOnlyApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void in_creditEndpoints_out_notFound() throws Exception {
        mockMvc.perform(get("/api/users/{userId}/credit/ledger", 1L).header("X-User-Id", 1L))
                .andExpect(status().isNotFound());
        mockMvc.perform(put("/api/users/me/credit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"credit_score\":100}"))
                .andExpect(status().isNotFound());
        mockMvc.perform(post("/api/users/me/credit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"credit_score\":100}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void in_profileSaveWithCreditScore_out_scoreUnchanged() throws Exception {
        // Given
        String token = login("linjianxia", "123456");

        // When
        mockMvc.perform(put("/api/users/me/profile")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "nickname": "林见夏",
                                  "birthday": "2003-05-18",
                                  "gender": "女",
                                  "city": "珠海",
                                  "school": "大三 · 视觉传达",
                                  "interests": ["摄影", "海边", "美食"],
                                  "travel_style": "随性游",
                                  "credit_score": 100,
                                  "credit_level": "excellent"
                                }
                                """))
                .andExpect(status().isOk());

        // Then
        mockMvc.perform(get("/api/users/{userId}/profile", 1L).header("X-User-Id", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credit_score").value(80))
                .andExpect(jsonPath("$.credit_level").value("good"));
    }

    private String login(String username, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "%s",
                                  "password": "%s"
                                }
                                """.formatted(username, password)))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.token");
    }
}
