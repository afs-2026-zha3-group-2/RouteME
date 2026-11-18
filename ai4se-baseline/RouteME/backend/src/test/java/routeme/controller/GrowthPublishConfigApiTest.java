package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import routeme.mapper.UserGrowthAccountMapper;

/**
 * 配置化发布经验：`routeme.growth.publish-exp = 20` 时新记录按 20 发放。
 */
@SpringBootTest(properties = "routeme.growth.publish-exp=20")
@AutoConfigureMockMvc
@Transactional
class GrowthPublishConfigApiTest {

    private static final String BODY = """
            {"content":"整条线基本没有爬升，日落前四十分钟到海边刚好。","intensity":"moderate","advice":"带一件防风外套。"}
            """;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserGrowthAccountMapper accountMapper;

    @Test
    void in_configuredTwenty_out_twentyExpGranted() throws Exception {
        mockMvc.perform(post("/api/trips/1/experiences")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().is2xxSuccessful());

        assertEquals(20, accountMapper.selectById(1L).getExpTotal(), "configured value is applied");
    }
}
