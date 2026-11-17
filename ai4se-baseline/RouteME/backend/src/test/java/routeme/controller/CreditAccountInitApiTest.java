package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
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
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;

import routeme.mapper.UserCreditAccountMapper;

/**
 * 注册即建信用账户：成功后读取主页为 80 / good；注册失败不留下信用账户。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CreditAccountInitApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserCreditAccountMapper accountMapper;

    @Test
    void in_newAccount_out_initialEightyGoodOnProfile() throws Exception {
        // Given
        MvcResult registered = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "CreditNewbie",
                                  "password": "routeme-demo",
                                  "nickname": "信用新人"
                                }
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        Number userId = JsonPath.read(registered.getResponse().getContentAsString(), "$.user.id");

        // When
        mockMvc.perform(get("/api/users/{userId}/profile", userId.longValue())
                        .header("X-User-Id", userId.longValue()))
                // Then
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credit_score").value(80))
                .andExpect(jsonPath("$.credit_level").value("good"));
    }

    @Test
    void in_duplicateUsername_out_noCreditAccountCreated() throws Exception {
        // Given
        long before = accountMapper.selectCount(null);
        requestRegister("CreditTaken", "第一次注册");
        long afterFirst = accountMapper.selectCount(null);

        // When
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "CreditTaken",
                                  "password": "routeme-demo",
                                  "nickname": "重复注册"
                                }
                                """))
                .andExpect(status().isConflict());
        long afterDuplicate = accountMapper.selectCount(null);

        // Then
        assertAll(
                () -> assertEquals(before + 1, afterFirst, "first registration creates one account"),
                () -> assertEquals(afterFirst, afterDuplicate, "duplicate registration adds no account"));
    }

    @Test
    void in_invalidPassword_out_noCreditAccountCreated() throws Exception {
        // Given
        long before = accountMapper.selectCount(null);

        // When
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "CreditShortPwd",
                                  "password": "short",
                                  "nickname": "密码太短"
                                }
                                """))
                .andExpect(status().isBadRequest());

        // Then
        assertEquals(before, accountMapper.selectCount(null), "invalid registration adds no account");
    }

    private void requestRegister(String username, String nickname) throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "%s",
                                  "password": "routeme-demo",
                                  "nickname": "%s"
                                }
                                """.formatted(username, nickname)))
                .andExpect(status().isCreated());
    }
}
