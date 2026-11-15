package routeme.repository.impl;

import java.util.List;
import java.util.Optional;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.core.toolkit.support.SFunction;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

/**
 * 各仓储适配的公共基类：只放跨表复用的简单查询，不含业务规则。
 *
 * <p>演示环境使用「当前最大 id + 1」生成主键（迁移脚本显式插入 id，测试可预期）。
 * 这里用 {@code LambdaQueryWrapper} 加只取一行的分页代替 {@code SELECT MAX(id)}，
 * 免去在注解或 XML 里为每张表重复写聚合 SQL。</p>
 */
public abstract class AbstractRepositoryImpl<M extends BaseMapper<T>, T> extends ServiceImpl<M, T> {

    protected long nextId(SFunction<T, Long> idColumn) {
        LambdaQueryWrapper<T> query = Wrappers.<T>lambdaQuery()
                .select(idColumn)
                .orderByDesc(idColumn);
        List<T> rows = page(new Page<T>(1, 1, false), query).getRecords();
        return rows.isEmpty() ? 1L : idColumn.apply(rows.getFirst()) + 1L;
    }

    /**
     * 取按某列排序后的首行；用于单例资源与「最新一条」检索，避免在 XML 里写重复的 LIMIT 语句。
     */
    protected Optional<T> firstBy(SFunction<T, ?> column, boolean ascending) {
        LambdaQueryWrapper<T> query = Wrappers.<T>lambdaQuery()
                .orderBy(true, ascending, column);
        List<T> rows = page(new Page<T>(1, 1, false), query).getRecords();
        return rows.stream().findFirst();
    }
}