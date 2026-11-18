package routeme.controller;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import routeme.constant.ExperienceLikeConstant;
import routeme.entity.CreditLedgerEntity;
import routeme.entity.ExperienceLikeEntity;
import routeme.mapper.CreditLedgerMapper;
import routeme.mapper.ExperienceLikeMapper;

/**
 * 体验点赞的 API 验收：首次 / 重复 / 取消 / 取消未赞、自赞 403、401、404 与并发去重。
 *
 * <p>种子数据：体验 1 由用户 2 发布（行程 1），体验 2 由用户 3 发布（行程 2）。</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ExperienceLikeApiTest {

    private static final long EXPERIENCE = 1L;
    private static final long AUTHOR = 2L;
    private static final long LIKER = 1L;
    private static final long OTHER_LIKER = 3L;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ExperienceLikeMapper likeMapper;

    @Autowired
    private CreditLedgerMapper ledgerMapper;

    @Test
    void in_firstLike_out_createdAndCountedOne() throws Exception {
        // Given
        long before = likeCount(EXPERIENCE);

        // When
        mockMvc.perform(post("/api/experiences/{id}/likes", EXPERIENCE).header("X-User-Id", LIKER))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.experience_id").value(EXPERIENCE))
                .andExpect(jsonPath("$.like_count").value(before + 1))
                .andExpect(jsonPath("$.is_liked").value(true));

        // Then
        assertAll(
                () -> assertEquals(before + 1, likeCount(EXPERIENCE), "row persisted"),
                () -> assertEquals(1, likeCount(EXPERIENCE, LIKER), "one row for the liker"),
                () -> assertEquals(0, likeRewardLedgerCount(AUTHOR), "one like stays below the first tier"));
    }

    @Test
    void in_repeatedLike_out_idempotentSuccess() throws Exception {
        // Given
        likeViaApi(LIKER, true);

        // When
        mockMvc.perform(post("/api/experiences/{id}/likes", EXPERIENCE).header("X-User-Id", LIKER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.like_count").value(likeCount(EXPERIENCE)))
                .andExpect(jsonPath("$.is_liked").value(true));

        // Then
        assertEquals(1, likeCount(EXPERIENCE, LIKER), "second request does not add a row");
    }

    @Test
    void in_unlike_out_rowDeletedAndCountRestored() throws Exception {
        // Given
        long before = likeCount(EXPERIENCE);
        likeViaApi(LIKER, true);

        // When
        mockMvc.perform(delete("/api/experiences/{id}/likes", EXPERIENCE).header("X-User-Id", LIKER))
                .andExpect(status().isNoContent());

        // Then
        assertAll(
                () -> assertEquals(before, likeCount(EXPERIENCE), "row removed"),
                () -> assertEquals(0, likeCount(EXPERIENCE, LIKER), "no row for the liker"));
    }

    @Test
    void in_unlikeNotLiked_out_idempotentNoContent() throws Exception {
        // Given
        long before = likeCount(EXPERIENCE);

        // When
        mockMvc.perform(delete("/api/experiences/{id}/likes", EXPERIENCE).header("X-User-Id", LIKER))
                .andExpect(status().isNoContent());

        // Then
        assertEquals(before, likeCount(EXPERIENCE), "no row is created");
    }

    @Test
    void in_ownExperienceLike_out_forbiddenWithoutSideEffect() throws Exception {
        // Given
        long before = likeCount(EXPERIENCE);

        // When
        mockMvc.perform(post("/api/experiences/{id}/likes", EXPERIENCE).header("X-User-Id", AUTHOR))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        // Then
        assertAll(
                () -> assertEquals(before, likeCount(EXPERIENCE), "no like row"),
                () -> assertEquals(0, likeRewardLedgerCount(AUTHOR), "no credit change"));
    }

    @Test
    void in_missingIdentity_out_demoUserRequired() throws Exception {
        // When / Then
        mockMvc.perform(post("/api/experiences/{id}/likes", EXPERIENCE))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("DEMO_USER_REQUIRED"));

        mockMvc.perform(delete("/api/experiences/{id}/likes", EXPERIENCE))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("DEMO_USER_REQUIRED"));
    }

    @Test
    void in_unknownExperience_out_notFoundWithoutSideEffect() throws Exception {
        // Given
        long likesBefore = totalLikeCount();
        long ledgerBefore = totalLedgerCount();

        // When / Then
        mockMvc.perform(post("/api/experiences/{id}/likes", 9999).header("X-User-Id", LIKER))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("EXPERIENCE_NOT_FOUND"));

        mockMvc.perform(delete("/api/experiences/{id}/likes", 9999).header("X-User-Id", LIKER))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("EXPERIENCE_NOT_FOUND"));

        assertAll(
                () -> assertEquals(likesBefore, totalLikeCount(), "no like row"),
                () -> assertEquals(ledgerBefore, totalLedgerCount(), "no credit change"));
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void in_concurrentLikes_out_singleRowPerUser() throws Exception {
        // Given
        long before = likeCount(EXPERIENCE);
        ExecutorService pool = Executors.newFixedThreadPool(3);
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Callable<Integer>> tasks = new ArrayList<>();
            for (long userId : List.of(LIKER, LIKER, OTHER_LIKER)) {
                tasks.add(() -> {
                    start.await();
                    return mockMvc.perform(post("/api/experiences/{id}/likes", EXPERIENCE)
                                    .header("X-User-Id", userId))
                            .andReturn().getResponse().getStatus();
                });
            }
            List<Future<Integer>> futures = new ArrayList<>();
            for (Callable<Integer> task : tasks) {
                futures.add(pool.submit(task));
            }

            // When
            start.countDown();
            List<Integer> statuses = new ArrayList<>();
            for (Future<Integer> future : futures) {
                statuses.add(future.get(10, TimeUnit.SECONDS));
            }

            // Then
            assertAll(
                    () -> statuses.forEach(status -> assertTrue(
                            status == 201 || status == 200, "concurrent like returns 2xx: " + statuses)),
                    () -> assertEquals(before + 2, likeCount(EXPERIENCE), "two distinct rows"),
                    () -> assertEquals(1, likeCount(EXPERIENCE, LIKER), "same user keeps one row"),
                    () -> assertEquals(1, likeCount(EXPERIENCE, OTHER_LIKER), "other user keeps one row"));
        } finally {
            pool.shutdownNow();
            likeMapper.delete(Wrappers.<ExperienceLikeEntity>lambdaQuery()
                    .eq(ExperienceLikeEntity::getExperienceId, EXPERIENCE)
                    .in(ExperienceLikeEntity::getUserId, List.of(LIKER, OTHER_LIKER)));
        }
    }

    private void likeViaApi(long userId, boolean created) throws Exception {
        mockMvc.perform(post("/api/experiences/{id}/likes", EXPERIENCE).header("X-User-Id", userId))
                .andExpect(status().is(created ? 201 : 200));
    }

    private long likeCount(long experienceId) {
        return likeMapper.countByExperience(experienceId);
    }

    private long likeCount(long experienceId, long userId) {
        return likeMapper.selectCount(Wrappers.<ExperienceLikeEntity>lambdaQuery()
                .eq(ExperienceLikeEntity::getExperienceId, experienceId)
                .eq(ExperienceLikeEntity::getUserId, userId));
    }

    private long totalLikeCount() {
        return likeMapper.selectCount(null);
    }

    private long likeRewardLedgerCount(long userId) {
        return ledgerMapper.selectCount(Wrappers.<CreditLedgerEntity>lambdaQuery()
                .eq(CreditLedgerEntity::getUserId, userId)
                .eq(CreditLedgerEntity::getReasonCode, ExperienceLikeConstant.REASON_CODE));
    }

    private long totalLedgerCount() {
        return ledgerMapper.selectCount(null);
    }
}
