package routeme.service;

import java.util.List;

import routeme.pojo.GrowthBooking;
import routeme.pojo.UserGrowth;

/**
 * 成长账户的唯一读写入口：读路径保证账户存在，写路径只允许经由记账方法。
 * 方法契约以本接口为准。
 */
public interface GrowthService {

    /**
     * 读取成长状态；账户缺失时按 0 EXP 建立，读取路径不写流水。
     */
    UserGrowth read(long userId);

    /**
     * 批量读取；用于列表页一次取数。账户缺失时按 0 EXP 补齐。
     */
    List<UserGrowth> readAll(List<Long> userIds);

    /**
     * 当日（北京时间自然日）已实发的正向经验，用于个人主页的每日上限提示。
     */
    int positiveExpToday(long userId);

    /**
     * 记账：正向按每日上限截断、负向最低 0；流水与账户同事务，幂等键重复时不再改动。
     */
    UserGrowth book(GrowthBooking booking);
}
