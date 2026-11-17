package routeme.service;

import java.util.List;

import routeme.pojo.CreditBooking;
import routeme.pojo.UserCredit;

/**
 * 信用账户的唯一读写入口：读路径保证账户存在，写路径只允许经由记账方法。
 * 方法契约以本接口为准。
 */
public interface CreditService {

    /**
     * 读取信用状态；账户缺失时按初始分建立（`INSERT OR IGNORE`），因此不会出现空值。
     */
    UserCredit read(long userId);

    /**
     * 批量读取；用于列表页一次取数。缺失账户按初始分补齐。
     */
    List<UserCredit> readAll(List<Long> userIds);

    /**
     * 确保账户存在并返回当前状态；已存在时不改变分数。
     */
    UserCredit ensureAccount(long userId);

    /**
     * 记账：裁断到 0–100，写入实际生效量，账本与账户同事务；幂等键重复时不再改动。
     */
    UserCredit book(CreditBooking booking);

    /**
     * 是否已记录过该幂等键；供调用方在写之前判定月度配额。
     */
    boolean recorded(String idempotencyKey);

    /**
     * 该幂等键下的这次业务事件是否已落账：并发下用它区分「本次真的写入」与「被唯一索引兑底」。
     */
    boolean recorded(String idempotencyKey, String relatedId);
}
