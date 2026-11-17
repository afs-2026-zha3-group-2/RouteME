package routeme.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import routeme.entity.CreditLedgerEntity;
import routeme.mapper.CreditLedgerMapper;
import routeme.mapper.ExperienceLikeMapper;
import routeme.pojo.CreditBooking;
import routeme.pojo.UserCredit;
import routeme.service.impl.ExperienceLikeRewardServiceImpl;

/**
 * C-4：同一行程同作者多篇体验时按单篇最高赞数判定，不把多篇赞数相加。
 */
class ExperienceLikeRewardServiceTest {

    private final ExperienceLikeMapper likeMapper = mock(ExperienceLikeMapper.class);
    private final CreditLedgerMapper ledgerMapper = mock(CreditLedgerMapper.class);
    private final CreditService creditService = mock(CreditService.class);
    private final Clock clock = Clock.fixed(Instant.parse("2026-11-17T04:00:00Z"), ZoneOffset.UTC);

    private final ExperienceLikeRewardServiceImpl service =
            new ExperienceLikeRewardServiceImpl(likeMapper, ledgerMapper, creditService, clock);

    @Test
    void in_multipleExperiences_out_maxLikesNotSum() {
        // Given：两篇分别 3 与 7 赞，相加会是 10（额外触发第二档）
        when(likeMapper.selectLikeCountsOfTripAuthor(1L, 2L)).thenReturn(List.of(3, 7));
        when(ledgerMapper.selectList(any())).thenReturn(List.of());
        when(creditService.book(any())).thenReturn(UserCredit.of(2L, 81));

        // When
        service.award(1L, 2L);

        // Then
        ArgumentCaptor<CreditBooking> bookings = ArgumentCaptor.forClass(CreditBooking.class);
        verify(creditService, times(1)).book(bookings.capture());
        verify(creditService, never()).book(org.mockito.ArgumentMatchers.argThat(
                booking -> booking.idempotencyKey() != null && booking.idempotencyKey().endsWith(":10")));
        assertEquals("EXPERIENCE_LIKE:1:2:5", bookings.getValue().idempotencyKey(), "only tier 5 is reached");
    }
}
