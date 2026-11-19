package routeme.config;

import java.time.Clock;
import java.time.LocalDate;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import routeme.constant.TripTimeZoneConstant;

/**
 * 演示种子行程的「未来锚点」日期自愈。
 *
 * <p>V4 / V12 给种子行程 5/6/7 写的是固定出发日：日期一旦翻篇（Asia/Shanghai），
 * 行程就进入旅行中 / 已结束并退出招募列表，演示首页与依赖它们的 E2E 会随运行日期
 * 变红（CI 曾在跨北京零点的运行里整批失败）。这里在每次启动时把出发日已到的锚点
 * 推回未来若干天；出发日尚未到来的锚点保留原日期，不动演示叙事。
 *
 * <p>只匹配三条演示种子标题，不碰用户自建行程；条件更新天然幂等。用业务时钟取
 * 「今天」，与行程状态推导同口径：固定时钟的测试库里种子日期保持原样。
 *
 * <p>选 SmartInitializingSingleton 是为了卡在 Flyway 迁移之后、Web 端口开放之前：
 * 健康探针一旦通过，锚点必然已自愈，CI 与分片脚本不会读到翻篇的种子。
 * 日期运算放在 Java 侧而非 SQL 侧，运行时 SQLite 与测试 H2 共用同一条语句。
 */
@Component
public class DemoTripAnchorRefresher implements SmartInitializingSingleton {

    private static final Logger log = LoggerFactory.getLogger(DemoTripAnchorRefresher.class);

    private final JdbcClient jdbc;
    private final Clock clock;

    public DemoTripAnchorRefresher(JdbcClient jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    @Override
    public void afterSingletonsInstantiated() {
        LocalDate today = LocalDate.now(clock.withZone(TripTimeZoneConstant.ZONE));
        shift("深圳大鹏半岛海岸线徒步", today, 4, 5);
        shift("佛山祖庙与岭南天地一日", today, 2, 2);
        shift("上海武康路咖啡散步", today, 8, 8);
    }

    /** 出发日已到（含当天）才推回未来：startOffset / endOffset 为相对今天的天数。 */
    private void shift(String title, LocalDate today, int startOffset, int endOffset) {
        int updated = jdbc.sql("UPDATE trip_plans SET start_date = ?, end_date = ? WHERE title = ? AND start_date <= ?")
                .param(today.plusDays(startOffset).toString())
                .param(today.plusDays(endOffset).toString())
                .param(title)
                .param(today.toString())
                .update();
        if (updated > 0) {
            log.info("demo trip anchor refreshed: {} -> {}..{}", title,
                    today.plusDays(startOffset), today.plusDays(endOffset));
        }
    }
}