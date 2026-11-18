package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import routeme.constant.ExperienceLikeConstant;
import routeme.config.FixedClockTestConfig;
import routeme.entity.CreditLedgerEntity;
import routeme.entity.UserCreditAccountEntity;
import routeme.entity.UserEntity;
import routeme.mapper.CreditLedgerMapper;
import routeme.mapper.UserCreditAccountMapper;
import routeme.mapper.UserMapper;
import routeme.service.ExperienceLikeRewardService;

/**
 * 获赞信用结算的 API 验收：档位阶梯、封顶、回落不重复、取消不回滚、重复投递幂等、
 * 点赞者与完成行程均不得分。
 *
 * <p>种子数据：体验 1 由用户 2 发布（行程 1），体验 2 由用户 3 发布（行程 2）。</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(FixedClockTestConfig.class)
class ExperienceLikeCreditApiTest {

    private static final long EXPERIENCE = 1L;
    private static final long TRIP = 1L;
    private static final long AUTHOR = 2L;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private UserCreditAccountMapper accountMapper;

    @Autowired
    private CreditLedgerMapper ledgerMapper;

    @Autowired
    private ExperienceLikeRewardService rewardService;

    @Test
    void in_firstFiveLikes_out_firstTierBooked() throws Exception {
        // When
        likeWithNewUsers(EXPERIENCE, 5, 1001);

        // Then
        List<CreditLedgerEntity> rows = generatedRows(AUTHOR);
        assertAll(
                () -> assertEquals(81, score(AUTHOR), "one tier adds one point"),
                () -> assertEquals(1, rows.size(), "one ledger row"),
                () -> assertEquals(1, rows.getFirst().getAppliedDelta(), "applied delta"),
                () -> assertEquals(80, rows.getFirst().getScoreBefore(), "score before"),
                () -> assertEquals(81, rows.getFirst().getScoreAfter(), "score after"),
                () -> assertEquals(ExperienceLikeConstant.REASON_CODE, rows.getFirst().getReasonCode()),
                () -> assertEquals(ExperienceLikeConstant.RELATED_TYPE, rows.getFirst().getRelatedType()),
                () -> assertEquals(String.valueOf(TRIP), rows.getFirst().getRelatedId(), "linked trip"),
                () -> assertEquals(
                        ExperienceLikeConstant.idempotencyKey(TRIP, AUTHOR, 5),
                        rows.getFirst().getIdempotencyKey()),
                () -> assertNotNull(Instant.parse(rows.getFirst().getOccurredAt()), "occurred at is ISO-8601"));
    }

    @Test
    void in_twentyFiveLikes_out_allTiersBookedOnce() throws Exception {
        // When
        likeWithNewUsers(EXPERIENCE, 25, 1101);

        // Then
        assertAll(
                () -> assertEquals(85, score(AUTHOR), "five tiers add five points"),
                () -> assertEquals(5, generatedRows(AUTHOR).size(), "one row per tier"),
                () -> assertEquals(
                        List.of(5, 10, 15, 20, 25),
                        generatedRows(AUTHOR).stream()
                                .map(row -> tierOf(row.getIdempotencyKey()))
                                .toList(),
                        "tiers booked in ascending order"),
                () -> assertTrue(
                        generatedRows(AUTHOR).stream().allMatch(row -> row.getAppliedDelta() == 1),
                        "every tier applies one point"));
    }

    @Test
    void in_twentySixLikes_out_cappedAtLastTier() throws Exception {
        // When
        likeWithNewUsers(EXPERIENCE, 26, 1201);

        // Then
        assertAll(
                () -> assertEquals(85, score(AUTHOR), "no score beyond tier 25"),
                () -> assertEquals(5, generatedRows(AUTHOR).size(), "no ledger row beyond tier 25"));
    }

    @Test
    void in_unlikeThenRelikeSameTier_out_noSecondBooking() throws Exception {
        // Given
        likeWithNewUsers(EXPERIENCE, 10, 1301);
        int before = score(AUTHOR);

        // When
        mockMvc.perform(delete("/api/experiences/{id}/likes", EXPERIENCE).header("X-User-Id", 1301))
                .andExpect(status().isNoContent());
        like(EXPERIENCE, 1301);

        // Then
        assertAll(
                () -> assertEquals(before, score(AUTHOR), "score unchanged after relike"),
                () -> assertEquals(2, generatedRows(AUTHOR).size(), "tier stays locked"));
    }

    @Test
    void in_unlikeAfterBooking_out_noRollback() throws Exception {
        // Given
        likeWithNewUsers(EXPERIENCE, 5, 1401);

        // When
        mockMvc.perform(delete("/api/experiences/{id}/likes", EXPERIENCE).header("X-User-Id", 1401))
                .andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/experiences/{id}/likes", EXPERIENCE).header("X-User-Id", 1402))
                .andExpect(status().isNoContent());

        // Then
        assertAll(
                () -> assertEquals(81, score(AUTHOR), "credit is not rolled back"),
                () -> assertEquals(1, generatedRows(AUTHOR).size(), "no negative ledger row"),
                () -> assertTrue(
                        generatedRows(AUTHOR).stream().allMatch(row -> row.getAppliedDelta() >= 0),
                        "ledger never goes negative"));
    }

    @Test
    void in_duplicateRewardDelivery_out_singleBooking() throws Exception {
        // Given
        likeWithNewUsers(EXPERIENCE, 5, 1501);

        // When
        rewardService.award(TRIP, AUTHOR);

        // Then
        assertAll(
                () -> assertEquals(81, score(AUTHOR), "duplicate delivery does not add score"),
                () -> assertEquals(1, generatedRows(AUTHOR).size(), "idempotency key keeps one row"));
    }

    @Test
    void in_likerOutcome_out_noCreditForLiker() throws Exception {
        // When
        like(EXPERIENCE, 1L);

        // Then
        assertAll(
                () -> assertEquals(80, score(1L), "liker score unchanged"),
                () -> assertTrue(generatedRows(1L).isEmpty(), "liker has no reward ledger"));
    }

    @Test
    void in_completedTrip_out_noExperienceLikeReward() throws Exception {
        // When
        mockMvc.perform(post("/api/trips/{id}/complete", 3L).header("X-User-Id", AUTHOR))
                .andExpect(status().isOk());

        // Then
        assertAll(
                () -> assertTrue(generatedRows(AUTHOR).isEmpty(), "completion alone awards nothing"),
                () -> assertTrue(likeRewardRows().isEmpty(), "no EXPERIENCE_LIKE ledger at all"));
    }

    private void likeWithNewUsers(long experienceId, int count, long firstUserId) throws Exception {
        for (int index = 0; index < count; index++) {
            long userId = firstUserId + index;
            createUser(userId);
            like(experienceId, userId);
        }
    }

    private void like(long experienceId, long userId) throws Exception {
        mockMvc.perform(post("/api/experiences/{id}/likes", experienceId).header("X-User-Id", userId))
                .andExpect(status().isCreated());
    }

    private void createUser(long id) {
        UserEntity user = new UserEntity();
        user.setId(id);
        user.setNickname("点赞者" + id);
        user.setAvatarInitial("赞");
        user.setSchool("");
        user.setBio("");
        user.setInterests("[]");
        user.setCreatedAt("2026-11-17T00:00:00Z");
        userMapper.insert(user);
    }

    private int score(long userId) {
        UserCreditAccountEntity account = accountMapper.selectById(userId);
        return account == null ? 0 : account.getScore();
    }

    private List<CreditLedgerEntity> likeRewardRows() {
        return ledgerMapper.selectList(Wrappers.<CreditLedgerEntity>lambdaQuery()
                .eq(CreditLedgerEntity::getReasonCode, ExperienceLikeConstant.REASON_CODE)
                .orderByAsc(CreditLedgerEntity::getId));
    }

    private List<CreditLedgerEntity> generatedRows(long userId) {
        return likeRewardRows().stream()
                .filter(row -> row.getUserId() == userId)
                .filter(row -> row.getIdempotencyKey() != null)
                .toList();
    }

    private static int tierOf(String idempotencyKey) {
        return Integer.parseInt(idempotencyKey.substring(idempotencyKey.lastIndexOf(':') + 1));
    }
}
