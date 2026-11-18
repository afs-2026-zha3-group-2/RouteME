package routeme.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;

import routeme.config.FixedClockTestConfig;
import routeme.enums.CreditLevel;
import routeme.pojo.UserCredit;

/** {@code CreditService.snapshot} 只读：不因浏览举报而创建账户。 */
@SpringBootTest
@org.springframework.context.annotation.Import(FixedClockTestConfig.class)
@Transactional
class CreditServiceSnapshotTest {

    private static final long USER = 999L;

    @Autowired
    private CreditService creditService;

    @Autowired
    private JdbcClient jdbcClient;

    @Test
    void snapshot_missingAccount_returnsInitialWithoutWriting() {
        jdbcClient.sql("DELETE FROM user_credit_account WHERE user_id = :id")
                .param("id", USER).update();

        UserCredit credit = creditService.snapshot(USER);

        assertThat(credit.userId()).isEqualTo(USER);
        assertThat(credit.score()).isEqualTo(80);
        assertThat(credit.level()).isEqualTo(CreditLevel.GOOD);
        assertThat(accountCount()).isZero();
    }

    @Test
    void snapshot_existingAccount_returnsStoredScore() {
        jdbcClient.sql("DELETE FROM user_credit_account WHERE user_id = :id")
                .param("id", USER).update();
        jdbcClient.sql("""
                        INSERT INTO user_credit_account (user_id, score, created_at, updated_at)
                        VALUES (:id, 47, :now, :now)
                        """)
                .param("id", USER)
                .param("now", FixedClockTestConfig.NOW.toString())
                .update();

        UserCredit credit = creditService.snapshot(USER);

        assertThat(credit.score()).isEqualTo(47);
        assertThat(credit.level()).isEqualTo(CreditLevel.LOW);
        assertThat(accountCount()).isEqualTo(1);
    }

    private int accountCount() {
        return jdbcClient.sql("SELECT COUNT(*) FROM user_credit_account WHERE user_id = :id")
                .param("id", USER).query(Integer.class).single();
    }
}
