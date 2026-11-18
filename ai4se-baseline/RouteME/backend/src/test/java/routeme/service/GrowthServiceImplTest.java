package routeme.service;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.UncategorizedSQLException;

import com.baomidou.mybatisplus.core.toolkit.support.SFunction;

import routeme.entity.GrowthExpLedgerEntity;
import routeme.entity.UserGrowthAccountEntity;
import routeme.mapper.GrowthExpLedgerMapper;
import routeme.mapper.UserGrowthAccountMapper;
import routeme.pojo.GrowthBooking;
import routeme.pojo.UserGrowth;
import routeme.service.impl.GrowthServiceImpl;

/**
 * 成长记账在 SQLite 上的唯一键分支：SQLite 的 SQLState 为空、错误码 19，
 * 驱动层只抛 {@link UncategorizedSQLException}（不是 {@link org.springframework.dao.DuplicateKeyException}），
 * 账户懒创建与流水幂等都必须按「重读后已存在」兜住，不能冒泡成 500。
 */
@ExtendWith(MockitoExtension.class)
class GrowthServiceImplTest {

    private static final long USER = 7L;
    private static final Instant NOW = Instant.parse("2026-11-18T04:00:00Z");

    @Mock
    private UserGrowthAccountMapper accountMapper;

    @Mock
    private GrowthExpLedgerMapper ledgerMapper;

    @Test
    void in_firstReadUniqueViolation_out_returnsFreshLevelOne() {
        // Given：两个请求同时懒创建账户，本请求的主键插入被并发请求抢先。
        when(accountMapper.selectById(USER)).thenReturn(null, account(0));
        when(accountMapper.insert(any(UserGrowthAccountEntity.class))).thenThrow(sqliteUniqueViolation());

        // When
        UserGrowth growth = service().read(USER);

        // Then：按重读到的账户返回，等效于并发请求创建成功。
        assertAll(
                () -> assertEquals(USER, growth.userId(), "same user"),
                () -> assertEquals(0, growth.expTotal(), "fresh account has no exp"),
                () -> assertEquals(1, growth.level(), "fresh account is LV1"));
    }

    @Test
    void in_ledgerUniqueViolation_out_treatedAsSettledOnce() {
        // Given：幂等键预检为空，真写入时并发请求已占用同一幂等键。
        when(ledgerMapper.selectCount(any())).thenReturn(0L, 1L);
        when(accountMapper.selectById(USER)).thenReturn(account(100));
        when(ledgerMapper.insert(any(GrowthExpLedgerEntity.class))).thenThrow(sqliteUniqueViolation());

        // When
        UserGrowth growth = service().book(new GrowthBooking(
                USER, "EXPERIENCE_PUBLISH", 10, "trip_experience", "5", "once-only-key"));

        // Then：视为已结算，账户保持并发请求写入后的经验。
        assertAll(
                () -> assertEquals(100, growth.expTotal(), "no double settlement"),
                () -> assertEquals(2, growth.level(), "level follows the stored exp"));
    }

    private GrowthServiceImpl service() {
        return new TestableGrowthService(accountMapper, ledgerMapper);
    }

    private static UserGrowthAccountEntity account(int expTotal) {
        UserGrowthAccountEntity entity = new UserGrowthAccountEntity();
        entity.setUserId(USER);
        entity.setExpTotal(expTotal);
        entity.setCreatedAt(NOW.toString());
        entity.setUpdatedAt(NOW.toString());
        return entity;
    }

    private static DataAccessException sqliteUniqueViolation() {
        return new UncategorizedSQLException(
                "insert",
                "INSERT INTO user_growth_account",
                new SQLException("UNIQUE constraint failed: user_growth_account.user_id", null, 19));
    }

    /**
     * 注入 mock 的流水 mapper，并让 nextId 从 1 递增（避免依赖真实分页查询）。
     */
    private static final class TestableGrowthService extends GrowthServiceImpl {

        private final AtomicLong ids = new AtomicLong();

        private TestableGrowthService(UserGrowthAccountMapper accountMapper, GrowthExpLedgerMapper ledgerMapper) {
            super(accountMapper, Clock.fixed(NOW, ZoneOffset.UTC));
            this.baseMapper = ledgerMapper;
        }

        @Override
        protected long nextId(SFunction<GrowthExpLedgerEntity, Long> idColumn) {
            return ids.incrementAndGet();
        }
    }
}
