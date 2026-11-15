package routeme.service.impl;

import java.util.List;
import java.util.Optional;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.core.toolkit.support.SFunction;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

/**
 * 各 ServiceImpl 的公共基类：只收敛跨表重复的取数动作，不含业务规则。
 *
 * <p>演示环境用「当前最大 id + 1」生成主键（迁移脚本显式插入 id，测试可预期）。
 * 这里用 {@code LambdaQueryWrapper} 加单行分页代替 {@code SELECT MAX(id)}，
 * 因此注解与接口里都不出现 SQL。</p>
 */
public abstract class AbstractServiceImpl<M extends BaseMapper<T>, T> extends ServiceImpl<M, T> {

    protected long nextId(SFunction<T, Long> idColumn) {
        LambdaQueryWrapper<T> query = Wrappers.<T>lambdaQuery()
                .select(idColumn)
                .orderByDesc(idColumn);
        List<T> rows = page(new Page<T>(1, 1, false), query).getRecords();
        return rows.isEmpty() ? 1L : idColumn.apply(rows.getFirst()) + 1L;
    }

    /**
     * 取按某列排序后的首行；用于单例资源与「最新一条」检索。
     */
    protected Optional<T> firstBy(SFunction<T, ?> column, boolean ascending) {
        LambdaQueryWrapper<T> query = Wrappers.<T>lambdaQuery()
                .orderBy(true, ascending, column);
        List<T> rows = page(new Page<T>(1, 1, false), query).getRecords();
        return rows.stream().findFirst();
    }
}