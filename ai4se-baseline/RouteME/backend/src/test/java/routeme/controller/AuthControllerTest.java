package routeme.controller;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthControllerTest {

    private static final String REGISTER_BODY = """
            {
              "username": "NewUser",
              "password": "routeme-demo",
              "nickname": "新同学",
              "school": "大二 · 建筑学",
              "bio": "想看海。",
              "interests": ["摄影", "海边"]
            }
            """;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void in_validRegister_out_createdSessionAndUser() throws Exception {
        register(REGISTER_BODY)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.expires_at").exists())
                .andExpect(jsonPath("$.user.nickname").value("新同学"))
                .andExpect(jsonPath("$.user.avatar_initial").value("新"))
                .andExpect(jsonPath("$.user.school").value("大二 · 建筑学"))
                .andExpect(jsonPath("$.user.password_hash").doesNotExist());
    }

    @Test
    void in_duplicateUsernameDifferentCase_out_usernameTaken() throws Exception {
        register(REGISTER_BODY).andExpect(status().isCreated());
        String duplicate = REGISTER_BODY.replace("\"NewUser\"", "\"newuser\"");

        register(duplicate)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("USERNAME_TAKEN"));
    }

    @Test
    void in_invalidUsername_out_invalidInput() throws Exception {
        register(REGISTER_BODY.replace("\"NewUser\"", "\"ab\""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));

        register(REGISTER_BODY.replace("\"NewUser\"", "\"bad name\""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_shortPassword_out_invalidInput() throws Exception {
        register(REGISTER_BODY.replace("\"routeme-demo\"", "\"short\""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_tooManyInterests_out_invalidInput() throws Exception {
        register(REGISTER_BODY.replace("[\"摄影\", \"海边\"]", "[\"一\", \"二\", \"三\", \"四\", \"五\", \"六\"]"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void in_correctPassword_out_loginSession() throws Exception {
        register(REGISTER_BODY).andExpect(status().isCreated());

        login("newuser", "routeme-demo")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.nickname").value("新同学"));
    }

    @Test
    void in_wrongPassword_out_invalidCredentials() throws Exception {
        register(REGISTER_BODY).andExpect(status().isCreated());

        login("newuser", "wrong-password")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void in_unknownOrDemoAccount_out_invalidCredentials() throws Exception {
        login("linjianxia", "routeme-demo")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));

        login("", "")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void in_validToken_out_currentUser() throws Exception {
        String token = register(REGISTER_BODY).andReturn().getResponse().getContentAsString();
        String bearer = "Bearer " + JsonPath.read(token, "$.token");

        mockMvc.perform(get("/api/auth/me").header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nickname").value("新同学"))
                .andExpect(jsonPath("$.interests.length()").value(2));
    }

    @Test
    void in_missingOrForgedToken_out_sessionInvalid() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_INVALID"));

        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer not-a-real-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_INVALID"));
    }

    @Test
    void in_logout_out_tokenRejected() throws Exception {
        String content = register(REGISTER_BODY).andReturn().getResponse().getContentAsString();
        String token = JsonPath.read(content, "$.token");
        String bearer = "Bearer " + token;

        mockMvc.perform(post("/api/auth/logout").header("Authorization", bearer))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/auth/me").header("Authorization", bearer))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_INVALID"));
    }

    @Test
    void in_registeredAccount_out_demoListStaysFour() throws Exception {
        register(REGISTER_BODY).andExpect(status().isCreated());

        mockMvc.perform(get("/api/users/demo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(4))
                .andExpect(jsonPath("$[0].nickname").value("林见夏"));
    }

    @Test
    void in_missingLogoutHeader_out_sessionInvalid() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_INVALID"));
    }

    private ResultActions register(String body) throws Exception {
        return mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private ResultActions login(String username, String password) throws Exception {
        String body = """
                {"username": "%s", "password": "%s"}
                """.formatted(username, password);
        return mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }
}