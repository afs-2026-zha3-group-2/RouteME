package routeme.service;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import routeme.entity.CreditLedgerEntity;
import routeme.entity.UserCreditAccountEntity;
import routeme.enums.CreditLevel;
import routeme.mapper.CreditLedgerMapper;
import routeme.mapper.UserCreditAccountMapper;
import routeme.pojo.CreditBooking;
import routeme.pojo.UserCredit;

/**
 * 记账服务的不变量：初始 80、上下界裁断取实际生效量、零变化仍留痕、
 * 幂等键只生效一次、账本等式成立。
 */
@SpringBootTest
@Transactional
class CreditServiceImplTest {

    private static final long USER = 901L;

    @Autowired
    private CreditService creditService;

    @Autowired
    private UserCreditAccountMapper accountMapper;

    @Autowired
    private CreditLedgerMapper ledgerMapper;

    @Test
    void in_noAccount_out_initialEightyGood() {
        // When
        UserCredit credit = creditService.read(USER);
        List<CreditLedgerEntity> ledger = ledgerRows();

        // Then
        assertAll(
                () -> assertEquals(80, credit.score(), "initial score"),
                () -> assertEquals(CreditLevel.GOOD, credit.level(), "initial level"),
                () -> assertTrue(ledger.isEmpty(), "reading creates no ledger row"));
    }

    @Test
    void in_score98_out_upperBoundClampedWithAppliedTwo() {
        // Given
        seedScore(98);

        // When
        UserCredit credit = creditService.book(CreditBooking.of(USER, "SYSTEM_ADJUST", 5));

        // Then
        CreditLedgerEntity row = ledgerRows().getFirst();
        assertAll(
                () -> assertEquals(100, credit.score(), "clamped at 100"),
                () -> assertEquals(98, row.getScoreBefore(), "before"),
                () -> assertEquals(100, row.getScoreAfter(), "after"),
                () -> assertEquals(2, row.getAppliedDelta(), "applied delta is the actual change"));
    }

    @Test
    void in_score3_out_lowerBoundClampedWithAppliedMinusThree() {
        // Given
        seedScore(3);

        // When
        UserCredit credit = creditService.book(CreditBooking.of(USER, "LEAVE_TRIP", -10));

        // Then
        CreditLedgerEntity row = ledgerRows().getFirst();
        assertAll(
                () -> assertEquals(0, credit.score(), "clamped at 0"),
                () -> assertEquals(3, row.getScoreBefore(), "before"),
                () -> assertEquals(0, row.getScoreAfter(), "after"),
                () -> assertEquals(-3, row.getAppliedDelta(), "applied delta is the actual change"));
    }

    @Test
    void in_score100_out_zeroDeltaStillWritesLedger() {
        // Given
        seedScore(100);

        // When
        UserCredit credit = creditService.book(CreditBooking.of(USER, "EXPERIENCE_LIKE", 5));

        // Then
        CreditLedgerEntity row = ledgerRows().getFirst();
        assertAll(
                () -> assertEquals(100, credit.score(), "score unchanged"),
                () -> assertEquals(100, row.getScoreBefore(), "before"),
                () -> assertEquals(100, row.getScoreAfter(), "after"),
                () -> assertEquals(0, row.getAppliedDelta(), "zero applied delta is kept as a fact"),
                () -> assertEquals("EXPERIENCE_LIKE", row.getReasonCode(), "reason kept"));
    }

    @Test
    void in_sameIdempotencyKey_out_singleRowAndSingleChange() {
        // Given
        seedScore(80);
        CreditBooking booking = new CreditBooking(USER, "EXPERIENCE_LIKE", 5, "experience", "77", "like:77");

        // When
        UserCredit first = creditService.book(booking);
        UserCredit second = creditService.book(booking);

        // Then
        assertAll(
                () -> assertEquals(85, first.score(), "first booking applies"),
                () -> assertEquals(85, second.score(), "duplicate booking does not apply twice"),
                () -> assertEquals(1, ledgerRows().size(), "one ledger row"),
                () -> assertEquals("77", ledgerRows().getFirst().getRelatedId(), "related business kept"));
    }

    @Test
    void in_everyLedgerRow_out_equationAndRangeHold() {
        // Given
        seedScore(20);
        creditService.book(CreditBooking.of(USER, "REPORT_UPHELD", -30));
        creditService.book(CreditBooking.of(USER, "EXPERIENCE_LIKE", 15));

        // When
        List<CreditLedgerEntity> rows = ledgerRows();

        // Then
        assertAll(
                () -> assertEquals(2, rows.size(), "two rows"),
                () -> rows.forEach(row -> assertEquals(
                        row.getScoreBefore() + row.getAppliedDelta(),
                        row.getScoreAfter(),
                        "scoreBefore + appliedDelta = scoreAfter")),
                () -> rows.forEach(row -> assertTrue(
                        row.getScoreBefore() >= 0 && row.getScoreBefore() <= 100
                                && row.getScoreAfter() >= 0 && row.getScoreAfter() <= 100,
                        "both ends stay inside 0–100")),
                () -> assertEquals(15, creditService.read(USER).score(), "20 - 20 + 15 = 15"));
    }

    private void seedScore(int score) {
        creditService.ensureAccount(USER);
        UserCreditAccountEntity entity = accountMapper.selectById(USER);
        entity.setScore(score);
        accountMapper.updateById(entity);
    }

    private List<CreditLedgerEntity> ledgerRows() {
        return ledgerMapper.selectList(Wrappers.<CreditLedgerEntity>lambdaQuery()
                .eq(CreditLedgerEntity::getUserId, USER)
                .orderByAsc(CreditLedgerEntity::getId));
    }
}
