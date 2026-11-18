package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import routeme.constant.GrowthConstant;
import routeme.entity.GrowthExpLedgerEntity;
import routeme.mapper.GrowthExpLedgerMapper;
import routeme.mapper.UserGrowthAccountMapper;

/**
 * 发布经验：首次 +10、编辑 / 重复提交 / 删除重建不重复、未完成行程不产生经验。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class GrowthPublishApiTest {

    private static final String BODY = """
            {"content":"整条线基本没有爬升，日落前四十分钟到海边刚好。","intensity":"moderate","advice":"带一件防风外套。"}
            """;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private UserGrowthAccountMapper accountMapper;

    @Autowired
    private GrowthExpLedgerMapper ledgerMapper;

    @Test
    void in_firstPublish_out_tenExpAndEditRepeatDeleteDoNotRepeat() throws Exception {
        publish(1L);
        assertAll(
                () -> assertEquals(10, expOf(1L), "first publish grants 10"),
                () -> assertEquals(1L, ledgerRows(), "one ledger row"));
        GrowthExpLedgerEntity row = ledgerMapper.selectList(null).getFirst();
        assertAll(
                () -> assertEquals(GrowthConstant.REASON_PUBLISH, row.getReasonCode(), "reason"),
                () -> assertEquals(GrowthConstant.RELATED_TRIP, row.getRelatedType(), "related type"),
                () -> assertEquals("1", row.getRelatedId(), "related trip"));

        publish(1L);
        publish(1L);
        assertAll(
                () -> assertEquals(10, expOf(1L), "edits and repeats do not grant"),
                () -> assertEquals(1L, ledgerRows(), "no second publish row"));

        jdbcClient.sql("DELETE FROM trip_experiences WHERE trip_id = 1 AND author_id = 1").update();
        publish(1L);
        assertAll(
                () -> assertEquals(10, expOf(1L), "delete then recreate does not grant"),
                () -> assertEquals(1L, ledgerRows(), "idempotency key survives delete"));
    }

    @Test
    void in_uncompletedTrip_out_rejectedWithoutGrowth() throws Exception {
        mockMvc.perform(post("/api/trips/5/experiences")
                        .header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().is4xxClientError());

        assertAll(
                () -> assertEquals(0, expOf(2L), "no growth for rejected publish"),
                () -> assertEquals(0L, ledgerRows(), "no ledger row"));
    }

    private void publish(long userId) throws Exception {
        mockMvc.perform(post("/api/trips/1/experiences")
                        .header("X-User-Id", String.valueOf(userId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().is2xxSuccessful());
    }

    private int expOf(long userId) {
        return accountMapper.selectById(userId).getExpTotal();
    }

    private long ledgerRows() {
        return ledgerMapper.selectCount(null);
    }
}
