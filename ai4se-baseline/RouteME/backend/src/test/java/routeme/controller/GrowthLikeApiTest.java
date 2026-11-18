package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import routeme.mapper.GrowthExpLedgerMapper;
import routeme.mapper.UserGrowthAccountMapper;

/**
 * 获赞经验：每 10 个有效赞 +5、同档不重复、取消不回滚、多篇各自分档。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class GrowthLikeApiTest {

    private static final long EXPERIENCE_ONE = 1L;
    private static final long AUTHOR_ONE = 2L;
    private static final long EXPERIENCE_TWO = 2L;
    private static final long AUTHOR_TWO = 3L;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private UserGrowthAccountMapper accountMapper;

    @Autowired
    private GrowthExpLedgerMapper ledgerMapper;

    @Test
    void in_tenthLike_out_fiveExpThenSameTierDoesNotRepeat() throws Exception {
        seedUsers(2001, 2020);
        seedLikes(EXPERIENCE_ONE, 2001, 9);

        like(EXPERIENCE_ONE, 2010L);
        assertAll(
                () -> assertEquals(5, expOf(AUTHOR_ONE), "tenth like grants 5"),
                () -> assertEquals(1L, ledgerRows(), "one like ledger row"));

        seedLikes(EXPERIENCE_ONE, 2011, 9);
        assertAll(
                () -> assertEquals(5, expOf(AUTHOR_ONE), "11–19 do not grant"),
                () -> assertEquals(1L, ledgerRows(), "no extra row"));

        like(EXPERIENCE_ONE, 2020L);
        assertAll(
                () -> assertEquals(10, expOf(AUTHOR_ONE), "twentieth like grants another 5"),
                () -> assertEquals(2L, ledgerRows(), "second tier leaves one row"));
    }

    @Test
    void in_cancelAndRelike_out_noRollbackAndNoDuplicate() throws Exception {
        seedUsers(2001, 2010);
        seedLikes(EXPERIENCE_ONE, 2001, 9);
        like(EXPERIENCE_ONE, 2010L);

        mockMvc.perform(delete("/api/experiences/{id}/likes", EXPERIENCE_ONE)
                        .header("X-User-Id", "2010"))
                .andExpect(status().isNoContent());
        like(EXPERIENCE_ONE, 2010L);

        assertAll(
                () -> assertEquals(5, expOf(AUTHOR_ONE), "cancel does not roll back"),
                () -> assertEquals(1L, ledgerRows(), "same tier is settled once"));
    }

    @Test
    void in_twoExperiences_out_eachTierSettledIndependently() throws Exception {
        seedUsers(2001, 2010);
        seedLikes(EXPERIENCE_ONE, 2001, 9);
        seedLikes(EXPERIENCE_TWO, 2001, 9);

        like(EXPERIENCE_ONE, 2010L);
        like(EXPERIENCE_TWO, 2010L);

        assertAll(
                () -> assertEquals(5, expOf(AUTHOR_ONE), "first experience settles"),
                () -> assertEquals(5, expOf(AUTHOR_TWO), "second experience settles independently"),
                () -> assertEquals(2L, ledgerRows(), "two tiers leave two rows"));
    }

    private void like(long experienceId, long userId) throws Exception {
        mockMvc.perform(post("/api/experiences/{id}/likes", experienceId)
                        .header("X-User-Id", String.valueOf(userId)))
                .andExpect(status().is2xxSuccessful());
    }

    private void seedUsers(long from, long to) {
        for (long userId = from; userId <= to; userId++) {
            jdbcClient.sql("""
                            INSERT INTO app_users (id, nickname, avatar_initial, school, bio, interests, created_at)
                            VALUES (:id, :nickname, '测', '', '', '[]', '2026-11-18T00:00:00Z')
                            """)
                    .param("id", userId)
                    .param("nickname", "测试用户" + userId)
                    .update();
        }
    }

    private void seedLikes(long experienceId, long fromUserId, int count) {
        for (int index = 0; index < count; index++) {
            long userId = fromUserId + index;
            long id = experienceId * 100000 + userId;
            jdbcClient.sql("""
                            INSERT INTO experience_likes (id, experience_id, user_id, created_at)
                            VALUES (:id, :experienceId, :userId, '2026-11-18T00:00:00Z')
                            """)
                    .param("id", id)
                    .param("experienceId", experienceId)
                    .param("userId", userId)
                    .update();
        }
    }

    private int expOf(long userId) {
        return accountMapper.selectById(userId).getExpTotal();
    }

    private long ledgerRows() {
        return ledgerMapper.selectCount(null);
    }
}
